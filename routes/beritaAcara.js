const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const sequelize = require("../config/sequelize");
const BeritaAcara = require("../model/BeritaAcara");
const Presensi = require("../model/Presensi");
const KelasTahunAjaran = require("../model/KelasTahunAjaran");
const User = require("../model/User");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const Pelajaran = require("../model/Pelajaran");

// ================== CREATE ==================
router.post(
  "/",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id_kelas_tahun_ajaran, judul, deskripsi, tanggal, presensi } = req.body;

      const beritaAcara = await BeritaAcara.create(
        {
          id_kelas_tahun_ajaran,
          judul,
          deskripsi,
          tanggal,
          id_created_by: req.user.id_user, 
        },
        { transaction: t }
      );

      if (Array.isArray(presensi) && presensi.length > 0) {
        const presensiData = presensi.map((p) => ({
          id_berita_acara: beritaAcara.id_berita_acara,
          id_siswa: p.id_siswa,
          status: p.status || "Alpha",
        }));

        await Presensi.bulkCreate(presensiData, { transaction: t });
      }

      await t.commit();

      res.status(201).json({
        message: "Berita acara dan presensi berhasil dibuat",
        data: beritaAcara,
      });
    } catch (error) {
      await t.rollback();
      res.status(500).json({
        message: "Terjadi kesalahan",
        error: error.message,
      });
    }
  }
);

// ================== GET ALL ==================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran } = req.query;
    const user = req.user; 
    let whereClause = {};

    if (id_kelas_tahun_ajaran) {
      whereClause.id_kelas_tahun_ajaran = id_kelas_tahun_ajaran;
    }

    const beritaAcaraList = await BeritaAcara.findAll({
      where: whereClause,
      include: [
        {
          model: KelasTahunAjaran,
          as: "kelasTahunAjaran",
        },
        {
          model: Presensi,
          as: "presensiList",
          include: [
            {
              model: User,
              as: "siswa",
              attributes: ["id_user", "nama", "email"],
            },
          ],
        },
      ],
      order: [
        ["tanggal", "DESC"],
        ["id_berita_acara", "DESC"],
      ],
    });

    // ========== Jika role siswa, ubah response =============
    if (user.role.toLowerCase() === "siswa") {
      const hasil = beritaAcaraList.map((ba) => {
        const presensiSiswa = ba.presensiList.find(
          (p) => p.id_siswa === user.id_user
        );

        return {
          id_berita_acara: ba.id_berita_acara,
          id_kelas_tahun_ajaran: ba.id_kelas_tahun_ajaran,
          judul: ba.judul,
          deskripsi: ba.deskripsi,
          tanggal: ba.tanggal,
          status_presensi: presensiSiswa ? presensiSiswa.status : "Alpha",
        };
      });

      return res.status(200).send({
        message: "success",
        data: hasil,
      });
    }

    // ========== Jika bukan siswa, return data lengkap ==========
    return res.status(200).send({
      message: "success",
      data: beritaAcaraList,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ================== GET BY ID ==================
router.get("/:id_berita_acara", authenticateToken, async (req, res) => {
  try {
    const { id_berita_acara } = req.params;
    const user = req.user;

    const beritaAcara = await BeritaAcara.findByPk(id_berita_acara, {
      include: [
        {
          model: KelasTahunAjaran,
          as: "kelasTahunAjaran",
          include: [
            {
              model: Pelajaran,
              as: "Pelajaran",
              attributes: ["id_pelajaran", "nama_pelajaran"],
            },
          ],
        },
        {
          model: Presensi,
          as: "presensiList",
          include: [
            {
              model: User,
              as: "siswa",
              attributes: ["id_user", "nama", "email"],
            },
          ],
        },
      ],
    });

    if (!beritaAcara) {
      return res.status(404).send({ message: "Berita acara tidak ditemukan" });
    }

    // ============== CEK HAK AKSES ==============
    if (
      beritaAcara.id_created_by !== user.id_user
    ) {
      return res.status(403).send({
        message: "Akses ditolak. Anda bukan pembuat berita acara ini.",
      });
    }

    return res.status(200).send({ message: "success", data: beritaAcara });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== UPDATE ==================
router.put(
  "/:id_berita_acara",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id_berita_acara } = req.params;
      const beritaAcara = await BeritaAcara.findByPk(id_berita_acara, { transaction: t });

      if (!beritaAcara) {
        await t.rollback();
        return res.status(404).send({ message: "Berita acara tidak ditemukan" });
      }

      const { judul, deskripsi, tanggal, presensi } = req.body;

      await beritaAcara.update(
        {
          judul: judul || beritaAcara.judul,
          deskripsi: deskripsi || beritaAcara.deskripsi,
          tanggal: tanggal || beritaAcara.tanggal,
          updated_at: new Date(),
        },
        { transaction: t }
      );

      if (Array.isArray(presensi)) {
        await Presensi.destroy({
          where: { id_berita_acara },
          transaction: t,
        });

        if (presensi.length > 0) {
          const presensiData = presensi.map((p) => ({
            id_berita_acara,
            id_siswa: p.id_siswa,
            status: p.status || "Alpha",
          }));
          await Presensi.bulkCreate(presensiData, { transaction: t });
        }
      }

      await t.commit();

      return res.status(200).send({
        message: "Berita acara dan presensi berhasil diperbarui",
        data: beritaAcara,
      });
    } catch (err) {
      await t.rollback();
      console.error(err);
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== DELETE ==================
router.delete(
  "/:id_berita_acara",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  async (req, res) => {
    try {
      const { id_berita_acara } = req.params;
      const beritaAcara = await BeritaAcara.findByPk(id_berita_acara);

      if (!beritaAcara) {
        return res.status(404).send({ message: "Berita acara tidak ditemukan" });
      }

      await beritaAcara.destroy();

      return res.status(200).send({ message: "Berita acara berhasil dihapus" });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

module.exports = router;
