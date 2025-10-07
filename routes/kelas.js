const express = require("express");
const router = express.Router();

const Kelas = require("../model/Kelas");
const User = require("../model/User");
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
      const { nama_kelas, tingkat, jurusan, wali_kelas } = req.body;

      if (!nama_kelas || !tingkat || !jurusan) {
        return res.status(400).send({ message: "Semua field wajib diisi" });
      }

      const kelas = await Kelas.create({
        nama_kelas,
        tingkat,
        jurusan,
        wali_kelas: wali_kelas || null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      return res.status(201).send({ message: "Kelas berhasil dibuat", data: kelas });
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
    const kelas = await Kelas.findAll({
      include: [
        {
          model: User,
          as: "wali",
          attributes: ["id_user", "nama"],
        },
      ],
      exclude: ["created_at", "update_at", "deleted_at"]
    });

    const result = kelas.map((k) => ({
      id_kelas: k.id_kelas,
      nama_kelas: k.nama_kelas,
      tingkat: k.tingkat,
      jurusan: k.jurusan,
      wali_kelas: k.wali_kelas,
      created_at: k.created_at,
      updated_at: k.updated_at,
      deleted_at: k.deleted_at,
      nama_wali_kelas: k.wali ? k.wali.nama : null, 
    }));

    res.json({
      message: "Berhasil ambil data kelas",
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ========================== GET SIMPLE (untuk autocomplete) ==========================
router.get("/simple", authenticateToken, async (req, res) => {
  try {
    const kelas = await Kelas.findAll({
      attributes: ["id_kelas", "nama_kelas"],
      where: { deleted_at: null },
    });

    res.json({
      message: "Berhasil ambil data kelas (simple)",
      data: kelas,
    });
  } catch (err) {
    res.status(500).json({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ========================== GET BY ID ==========================
router.get("/:id_kelas", authenticateToken, async (req, res) => {
  try {
    const { id_kelas } = req.params;
    const kelas = await Kelas.findByPk(id_kelas, {
      include: [
        {
          model: User,
          as: "wali",
          attributes: ["id_user", "nama"],
        },
      ],
      exclude: ["created_at", "update_at", "deleted_at"]
    });

    if (!kelas) {
      return res.status(404).send({ message: "Kelas tidak ditemukan" });
    }

    const result = {
      id_kelas: kelas.id_kelas,
      nama_kelas: kelas.nama_kelas,
      tingkat: kelas.tingkat,
      jurusan: kelas.jurusan,
      wali_kelas: kelas.wali_kelas,
      created_at: kelas.created_at,
      updated_at: kelas.updated_at,
      deleted_at: kelas.deleted_at,
      nama_wali_kelas: kelas.wali ? kelas.wali.nama : null, // hanya nama wali
    };

    return res.status(200).send({ message: "success", data: result });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== UPDATE ==========================
router.put(
  "/:id_kelas",
  authenticateToken,
  authorizeRole(["Admin"]),
  async (req, res) => {
    try {
      const { id_kelas } = req.params;
      const kelas = await Kelas.findByPk(id_kelas);

      if (!kelas) {
        return res.status(404).send({ message: "Kelas tidak ditemukan" });
      }

      const updateData = { ...req.body, updated_at: new Date() };

      await kelas.update(updateData);

      return res.status(200).send({ message: "Kelas berhasil diupdate", data: kelas });
    } catch (err) {
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ========================== DELETE ==========================
router.delete(
  "/:id_kelas",
  authenticateToken,
  authorizeRole(["Admin"]),
  async (req, res) => {
    try {
      const { id_kelas } = req.params;

      // Cek apakah kelas ada
      const kelas = await Kelas.findByPk(id_kelas);
      if (!kelas) {
        return res.status(404).send({ message: "Kelas tidak ditemukan" });
      }

      // Cari semua kelas_tahun_ajaran yang terkait dengan kelas ini
      const kelasTahunAjaranList = await KelasTahunAjaran.findAll({
        where: { id_kelas },
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

      // Hapus semua kelas_tahun_ajaran yang terkait dengan kelas ini
      await KelasTahunAjaran.destroy({ where: { id_kelas } });

      // Hapus semua kelas_siswa yang terkait dengan kelas ini
      await KelasSiswa.destroy({ where: { id_kelas } });

      // Hapus kelas itu sendiri
      await kelas.destroy();

      return res.status(200).send({
        message:
          "Kelas dan semua data terkait (jadwal pelajaran, kelas tahun ajaran, kelas siswa) berhasil dihapus",
      });
    } catch (err) {
      return res.status(500).send({
        message: "Terjadi kesalahan saat menghapus kelas",
        error: err.message,
      });
    }
  }
);

module.exports = router;
