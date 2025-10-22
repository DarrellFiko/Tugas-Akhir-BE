const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const Ujian = require("../model/Ujian");
const KelasTahunAjaran = require("../model/KelasTahunAjaran");
const KelasSiswa = require("../model/KelasSiswa");
const User = require("../model/User");
const Soal = require("../model/Soal");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const getImageUrl = (req, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/soal/${filename}`;
};

// ================== CREATE ==================
router.post("/", authenticateToken, authorizeRole(["Admin", "Guru"]), async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran, jenis_ujian, list_siswa, start_date, end_date } = req.body;

    if (!id_kelas_tahun_ajaran || !jenis_ujian || !list_siswa || !start_date || !end_date) {
      return res.status(400).send({
        message: "Field wajib: id_kelas_tahun_ajaran, jenis_ujian, list_siswa, start_date, end_date",
      });
    }

    // Pastikan list_siswa berupa array
    let parsedList = list_siswa;
    if (typeof list_siswa === "string") {
      try {
        parsedList = JSON.parse(list_siswa);
      } catch {
        parsedList = [];
      }
    }
    if (!Array.isArray(parsedList) || parsedList.length === 0) {
      return res.status(400).send({ message: "Minimal harus ada 1 siswa di list_siswa" });
    }

    // Cek duplikat ujian
    const existing = await Ujian.findOne({
      where: {
        id_kelas_tahun_ajaran,
        jenis_ujian,
        deleted_at: null,
      },
    });

    if (existing) {
      return res.status(400).send({
        message: "Ujian dengan jenis yang sama sudah ada pada kelas ini",
      });
    }

    const ujian = await Ujian.create({
      id_kelas_tahun_ajaran,
      jenis_ujian,
      list_siswa: parsedList,
      start_date,
      end_date,
      id_created_by: req.user.id_user,
    });

    return res.status(201).send({
      message: "Ujian berhasil dibuat",
      data: ujian,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: error.message,
    });
  }
});

// ================== GET ALL ==================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran } = req.query;
    const whereClause = { deleted_at: null };

    if (id_kelas_tahun_ajaran) whereClause.id_kelas_tahun_ajaran = id_kelas_tahun_ajaran;

    const ujianList = await Ujian.findAll({
      where: whereClause,
      include: [{ model: KelasTahunAjaran, as: "kelasTahunAjaran" }],
      order: [
        ["start_date", "DESC"],
        ["id_ujian", "DESC"],
      ],
    });

    const dataWithCount = await Promise.all(
      ujianList.map(async (ujian) => {
        const totalSiswa = await KelasSiswa.count({
          where: {
            id_kelas: ujian.kelasTahunAjaran.id_kelas,
            id_tahun_ajaran: ujian.kelasTahunAjaran.id_tahun_ajaran,
            deleted_at: null,
          },
        });
        return { ...ujian.toJSON(), totalSiswa };
      })
    );

    return res.status(200).send({ message: "success", data: dataWithCount });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== GET BY ID ==================
router.get("/:id_ujian", authenticateToken, async (req, res) => {
  try {
    const { id_ujian } = req.params;
    const userRole = req.user?.role || null; 

    const ujian = await Ujian.findOne({
      where: { id_ujian, deleted_at: null },
      include: [
        { model: KelasTahunAjaran, as: "kelasTahunAjaran" },
        {
          model: Soal,
          as: "soalList",
          attributes: [
            "id_soal",
            "jenis_soal",
            "text_soal",
            "list_jawaban",
            "jawaban_benar",
            "gambar",
            "score",
          ],
          where: { deleted_at: null },
          required: false,
        },
      ],
    });

    if (!ujian)
      return res.status(404).send({ message: "Ujian tidak ditemukan" });

    // Dapatkan daftar siswa berdasarkan list_siswa
    const siswaList = Array.isArray(ujian.list_siswa) ? ujian.list_siswa : [];
    const siswaDetail = await User.findAll({
      where: { id_user: siswaList },
      attributes: ["id_user", "nama", "email"],
    });

    // Jika guru, sertakan soal + gambar_url
    // Jika siswa, jangan kirim soalList sama sekali
    let soalWithUrl = [];
    if (userRole.toLowerCase() === "guru") {
      soalWithUrl = (ujian.soalList || []).map((soal) => ({
        ...soal.toJSON(),
        gambar_url: soal.gambar ? getImageUrl(req, soal.gambar) : null,
      }));
    }

    // Susun respons sesuai role
    const responseData = {
      ...ujian.toJSON(),
      soalList: userRole.toLowerCase() === "guru" ? soalWithUrl : undefined,
      jumlah_siswa: siswaDetail.length,
      siswa_detail: siswaDetail,
    };

    return res.status(200).send({
      message: "success",
      data: responseData,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== UPDATE ==================
router.put("/:id_ujian", authenticateToken, authorizeRole(["Admin", "Guru"]), async (req, res) => {
  try {
    const { id_ujian } = req.params;
    const ujian = await Ujian.findOne({ where: { id_ujian, deleted_at: null } });

    if (!ujian) return res.status(404).send({ message: "Ujian tidak ditemukan" });

    const { id_kelas_tahun_ajaran, jenis_ujian, list_siswa, start_date, end_date } = req.body;

    // Cek duplikat ujian
    if (
      (jenis_ujian && jenis_ujian !== ujian.jenis_ujian) ||
      (id_kelas_tahun_ajaran && id_kelas_tahun_ajaran !== ujian.id_kelas_tahun_ajaran)
    ) {
      const existing = await Ujian.findOne({
        where: {
          id_kelas_tahun_ajaran: id_kelas_tahun_ajaran || ujian.id_kelas_tahun_ajaran,
          jenis_ujian: jenis_ujian || ujian.jenis_ujian,
          id_ujian: { [Op.ne]: id_ujian },
          deleted_at: null,
        },
      });
      if (existing)
        return res.status(400).send({ message: "Ujian dengan jenis yang sama sudah ada pada kelas ini" });
    }

    let parsedList = list_siswa;
    if (typeof list_siswa === "string") {
      try {
        parsedList = JSON.parse(list_siswa);
      } catch {
        parsedList = ujian.list_siswa;
      }
    }

    await ujian.update({
      id_kelas_tahun_ajaran: id_kelas_tahun_ajaran || ujian.id_kelas_tahun_ajaran,
      jenis_ujian: jenis_ujian || ujian.jenis_ujian,
      list_siswa: parsedList || ujian.list_siswa,
      start_date: start_date || ujian.start_date,
      end_date: end_date || ujian.end_date,
      updated_at: new Date(),
    });

    return res.status(200).send({ message: "Ujian berhasil diperbarui", data: ujian });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== SOFT DELETE ==================
router.delete("/:id_ujian", authenticateToken, authorizeRole(["Admin", "Guru"]), async (req, res) => {
  try {
    const { id_ujian } = req.params;
    const ujian = await Ujian.findOne({ where: { id_ujian, deleted_at: null } });

    if (!ujian) return res.status(404).send({ message: "Ujian tidak ditemukan" });

    await ujian.update({ deleted_at: new Date() });

    return res.status(200).send({ message: "Ujian berhasil dihapus (soft delete)" });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

module.exports = router;
