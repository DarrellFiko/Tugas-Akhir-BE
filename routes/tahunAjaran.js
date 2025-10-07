const express = require("express");
const router = express.Router();

const TahunAjaran = require("../model/TahunAjaran");
const JadwalPelajaran = require("../model/JadwalPelajaran");
const KelasTahunAjaran = require("../model/KelasTahunAjaran");
const KelasSiswa = require("../model/KelasSiswa");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// ========================== CREATE ==========================
router.post(
  "/",
  authenticateToken,
  authorizeRole(["Admin"]),
  async (req, res) => {
    try {
      const { nama, start_date, end_date, is_aktif } = req.body;

      if (!nama || !start_date || !end_date) {
        return res.status(400).send({ message: "Semua field wajib diisi" });
      }

      const tahunAjaran = await TahunAjaran.create({
        nama,
        start_date,
        end_date,
        is_aktif: is_aktif || 0,
        created_at: new Date(),
        updated_at: new Date(),
      });

      return res
        .status(201)
        .send({ message: "Tahun ajaran berhasil dibuat", tahunAjaran });
    } catch (err) {
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ========================== GET ALL ==========================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const tahunAjaran = await TahunAjaran.findAll({
      order: [["start_date", "DESC"]],
    });

    return res.status(200).send({ message: "success", data: tahunAjaran });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== GET SIMPLE (untuk autocomplete) ==========================
router.get("/simple", authenticateToken, async (req, res) => {
  try {
    const tahunAjaran = await TahunAjaran.findAll({
      attributes: ["id_tahun_ajaran", "nama"],
      order: [["start_date", "DESC"]],
      raw: true,
    });

    const formatted = tahunAjaran.map((item) => ({
      id_tahun_ajaran: item.id_tahun_ajaran,
      nama: item.nama,
    }));

    return res.status(200).send({
      message: "success",
      data: formatted,
    });
  } catch (err) {
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ========================== GET BY ID ==========================
router.get("/:id_tahun_ajaran", authenticateToken, async (req, res) => {
  try {
    const { id_tahun_ajaran } = req.params;
    const tahunAjaran = await TahunAjaran.findByPk(id_tahun_ajaran);

    if (!tahunAjaran) {
      return res.status(404).send({ message: "Tahun ajaran tidak ditemukan" });
    }

    return res.status(200).send({ message: "success", data: tahunAjaran });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== UPDATE ==========================
router.put(
  "/:id_tahun_ajaran",
  authenticateToken,
  authorizeRole(["Admin"]),
  async (req, res) => {
    try {
      const { id_tahun_ajaran } = req.params;
      const tahunAjaran = await TahunAjaran.findByPk(id_tahun_ajaran);

      if (!tahunAjaran) {
        return res.status(404).send({ message: "Tahun ajaran tidak ditemukan" });
      }

      const updateData = {
        nama: req.body.nama,
        start_date: req.body.start_date,
        end_date: req.body.end_date,
        is_aktif: req.body.is_aktif ?? tahunAjaran.is_aktif,
        updated_at: new Date(),
      };

      await tahunAjaran.update(updateData);

      return res
        .status(200)
        .send({ message: "Tahun ajaran berhasil diupdate", tahunAjaran });
    } catch (err) {
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ========================== DELETE ==========================
router.delete(
  "/:id_tahun_ajaran",
  authenticateToken,
  authorizeRole(["Admin"]),
  async (req, res) => {
    try {
      const { id_tahun_ajaran } = req.params;

      // Cek apakah tahun ajaran ada
      const tahunAjaran = await TahunAjaran.findByPk(id_tahun_ajaran);
      if (!tahunAjaran) {
        return res
          .status(404)
          .send({ message: "Tahun ajaran tidak ditemukan" });
      }

      // Ambil semua kelas_tahun_ajaran berdasarkan tahun ajaran ini
      const kelasTahunAjaranList = await KelasTahunAjaran.findAll({
        where: { id_tahun_ajaran },
        attributes: ["id_kelas_tahun_ajaran"],
      });

      // Hapus semua jadwal_pelajaran yang terkait dengan setiap kelas_tahun_ajaran
      const idKelasTahunAjaranList = kelasTahunAjaranList.map(
        (item) => item.id_kelas_tahun_ajaran
      );

      if (idKelasTahunAjaranList.length > 0) {
        await JadwalPelajaran.destroy({
          where: { id_kelas_tahun_ajaran: idKelasTahunAjaranList },
        });
      }

      // Hapus semua kelas_tahun_ajaran yang terkait dengan tahun ajaran ini
      await KelasTahunAjaran.destroy({
        where: { id_tahun_ajaran },
      });

      // Hapus semua kelas_siswa yang terkait dengan tahun ajaran ini
      await KelasSiswa.destroy({
        where: { id_tahun_ajaran },
      });

      // Hapus tahun_ajaran itu sendiri
      await tahunAjaran.destroy();

      return res.status(200).send({
        message:
          "Tahun ajaran dan semua data terkait (jadwal pelajaran, kelas tahun ajaran, kelas siswa) berhasil dihapus",
      });
    } catch (err) {
      return res.status(500).send({
        message: "Terjadi kesalahan saat menghapus tahun ajaran",
        error: err.message,
      });
    }
  }
);


module.exports = router;
