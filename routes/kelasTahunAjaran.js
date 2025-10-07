const express = require("express");
const router = express.Router();
const KelasTahunAjaran = require("../model/KelasTahunAjaran");
const Kelas = require("../model/Kelas");
const TahunAjaran = require("../model/TahunAjaran");
const Pelajaran = require("../model/Pelajaran");
const User = require("../model/User");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const JadwalPelajaran = require("../model/JadwalPelajaran");

// ================== CREATE ==================
router.post("/", authenticateToken, authorizeRole("Admin"), async (req, res) => {
  try {
    const { id_tahun_ajaran, id_kelas, id_pelajaran, guru_pengampu } = req.body;

    const newData = await KelasTahunAjaran.create({
      id_tahun_ajaran,
      id_kelas,
      id_pelajaran,
      guru_pengampu,
    });

    return res.status(201).send({ message: "success", data: newData });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== GET ALL ==================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const data = await KelasTahunAjaran.findAll({
      where: { deleted_at: null },
      include: [
        { model: Kelas, as: "Kelas", attributes: ["id_kelas", "nama_kelas"] },
        {
          model: TahunAjaran,
          as: "TahunAjaran",
          attributes: ["id_tahun_ajaran", "nama"],
        },
        {
          model: Pelajaran,
          as: "Pelajaran",
          attributes: ["id_pelajaran", "nama_pelajaran"],
        },
        { model: User, as: "GuruPengampu", attributes: ["id_user", "nama"] },
      ],
      raw: true,
      nest: true,
    });

    const formatted = data.map((item) => ({
      ...item,
      TahunAjaran: {
        id_tahun_ajaran: item.TahunAjaran.id_tahun_ajaran,
        nama: `${item.TahunAjaran.nama}`,
      },
    }));

    return res.status(200).send({ message: "success", data: formatted });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== GET BY ID ==================
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const data = await KelasTahunAjaran.findOne({
      where: { id_kelas_tahun_ajaran: req.params.id, deleted_at: null },
      include: [
        { model: Kelas, as: "Kelas", attributes: ["id_kelas", "nama_kelas"] },
        {
          model: TahunAjaran,
          as: "TahunAjaran",
          attributes: ["id_tahun_ajaran", "nama"],
        },
        {
          model: Pelajaran,
          as: "Pelajaran",
          attributes: ["id_pelajaran", "nama_pelajaran"],
        },
        { model: User, as: "GuruPengampu", attributes: ["id_user", "nama"] },
      ],
      raw: true,
      nest: true,
    });

    if (!data) return res.status(404).send({ message: "Data tidak ditemukan" });

    const formatted = {
      ...data,
      TahunAjaran: {
        id_tahun_ajaran: data.TahunAjaran.id_tahun_ajaran,
        nama: `${data.TahunAjaran.nama}`,
      },
    };

    return res.status(200).send({ message: "success", data: formatted });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== UPDATE ==================
router.put("/:id", authenticateToken, authorizeRole("Admin"), async (req, res) => {
  try {
    const { id_tahun_ajaran, id_kelas, id_pelajaran, guru_pengampu } = req.body;

    const [updated] = await KelasTahunAjaran.update(
      { id_tahun_ajaran, id_kelas, id_pelajaran, guru_pengampu },
      { where: { id_kelas_tahun_ajaran: req.params.id } }
    );

    if (!updated) return res.status(404).send({ message: "Data tidak ditemukan" });

    return res.status(200).send({ message: "success" });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== DELETE (Soft Delete) ==================
router.delete("/:id", authenticateToken, authorizeRole("Admin"), async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah data KelasTahunAjaran ada
    const data = await KelasTahunAjaran.findOne({
      where: { id_kelas_tahun_ajaran: id, deleted_at: null },
    });

    if (!data) {
      return res.status(404).send({ message: "Data tidak ditemukan" });
    }

    // Hapus (hard delete) semua jadwal pelajaran yang terkait dengan kelas_tahun_ajaran ini
    await JadwalPelajaran.destroy({
      where: { id_kelas_tahun_ajaran: id },
    });

    // Soft delete kelas_tahun_ajaran
    await data.update({ deleted_at: new Date() });
    
    return res.status(200).send({
      message:
        "Kelas tahun ajaran dan semua jadwal pelajaran terkait berhasil dihapus",
    });
  } catch (err) {
    return res.status(500).send({
      message: "Terjadi kesalahan saat menghapus data",
      error: err.message,
    });
  }
});


module.exports = router;
