const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const KelasTahunAjaran = require("../model/KelasTahunAjaran");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// ========================== CREATE ==========================
router.post("/", authenticateToken, authorizeRole(["Admin"]), async (req, res) => {
  try {
    const { id_tahun_ajaran, id_kelas, id_pelajaran, guru_pengampu } = req.body;

    if (!id_tahun_ajaran || !id_kelas || !id_pelajaran || !guru_pengampu) {
      return res.status(400).send({ message: "Semua field wajib diisi" });
    }

    const kelasTahunAjaran = await KelasTahunAjaran.create({
      id_tahun_ajaran,
      id_kelas,
      id_pelajaran,
      guru_pengampu,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return res.status(201).send({
      message: "Kelas tahun ajaran berhasil dibuat",
      data: kelasTahunAjaran,
    });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== GET ALL ==========================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const kelasTahunAjaran = await KelasTahunAjaran.findAll({
      order: [["id_kelas_tahun_ajaran", "ASC"]],
    });

    return res.status(200).send({
      message: "success",
      data: kelasTahunAjaran,
    });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== GET BY ID ==========================
router.get("/:id_kelas_tahun_ajaran", authenticateToken, async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran } = req.params;

    const kelasTahunAjaran = await KelasTahunAjaran.findByPk(id_kelas_tahun_ajaran);

    if (!kelasTahunAjaran) {
      return res.status(404).send({ message: "Data tidak ditemukan" });
    }

    return res.status(200).send({
      message: "success",
      data: kelasTahunAjaran,
    });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== UPDATE ==========================
router.put("/:id_kelas_tahun_ajaran", authenticateToken, authorizeRole(["Admin"]), async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran } = req.params;

    const kelasTahunAjaran = await KelasTahunAjaran.findByPk(id_kelas_tahun_ajaran);
    if (!kelasTahunAjaran) {
      return res.status(404).send({ message: "Data tidak ditemukan" });
    }

    const updateData = { ...req.body, updated_at: new Date() };

    await kelasTahunAjaran.update(updateData);

    return res.status(200).send({
      message: "Data berhasil diupdate",
      data: kelasTahunAjaran,
    });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== DELETE ==========================
router.delete("/:id_kelas_tahun_ajaran", authenticateToken, authorizeRole(["Admin"]), async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran } = req.params;

    const kelasTahunAjaran = await KelasTahunAjaran.findByPk(id_kelas_tahun_ajaran);
    if (!kelasTahunAjaran) {
      return res.status(404).send({ message: "Data tidak ditemukan" });
    }

    await kelasTahunAjaran.destroy();

    return res.status(200).send({ message: "Data berhasil dihapus" });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

module.exports = router;
