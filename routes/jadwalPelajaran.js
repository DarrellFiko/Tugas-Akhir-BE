const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const JadwalPelajaran = require("../model/JadwalPelajaran");
const KelasTahunAjaran = require("../model/KelasTahunAjaran");
const User = require("../model/User");

const { authenticateToken, authorizeRole } = require("../middleware/auth");

// ========================== CREATE JADWAL ==========================
router.post("/", authenticateToken, authorizeRole(["Admin"]), async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran, hari, jam_mulai, jam_selesai } = req.body;

    if (!id_kelas_tahun_ajaran || !hari || !jam_mulai || !jam_selesai) {
      return res.status(400).send({ message: "Semua field wajib diisi" });
    }

    const jadwal = await JadwalPelajaran.create({
      id_kelas_tahun_ajaran,
      hari,
      jam_mulai,
      jam_selesai,
      created_at: new Date(),
    });

    return res.status(201).send({ message: "Jadwal berhasil dibuat", jadwal });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== BULK CREATE JADWAL ==========================
router.post("/bulk", authenticateToken, authorizeRole(["Admin"]), async (req, res) => {
  try {
    const { jadwalList } = req.body;

    if (!Array.isArray(jadwalList) || jadwalList.length === 0) {
      return res
        .status(400)
        .send({ message: "jadwalList harus berupa array dan tidak boleh kosong" });
    }

    // Validasi setiap item
    for (const j of jadwalList) {
      if (!j.id_kelas_tahun_ajaran || !j.hari || !j.jam_mulai || !j.jam_selesai) {
        return res.status(400).send({
          message: "Setiap jadwal wajib memiliki id_kelas_tahun_ajaran, hari, jam_mulai, dan jam_selesai",
        });
      }
    }

    const newJadwal = jadwalList.map((j) => ({
      id_kelas_tahun_ajaran: j.id_kelas_tahun_ajaran,
      hari: j.hari,
      jam_mulai: j.jam_mulai,
      jam_selesai: j.jam_selesai,
      created_at: new Date(),
    }));

    const createdJadwal = await JadwalPelajaran.bulkCreate(newJadwal);

    return res.status(201).send({
      message: "Jadwal berhasil dibuat secara bulk",
      jadwal: createdJadwal,
    });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== GET JADWAL BY KELAS TAHUN AJARAN ==========================
router.get("/:id_kelas_tahun_ajaran", authenticateToken, async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran } = req.params;

    const jadwal = await JadwalPelajaran.findAll({
      where: { id_kelas_tahun_ajaran },
      include: [
        {
          model: KelasTahunAjaran,
          as: "kelasTahunAjaran",
          include: [
            { model: User, as: "guru", attributes: ["id_user", "nama"] },
          ],
        },
      ],
      order: [["jam_mulai", "ASC"]],
    });

    if (!jadwal || jadwal.length === 0) {
      return res.status(200).send({ message: "success", jadwal: [] });
    }

    // Grouping berdasarkan hari
    const grouped = jadwal.reduce((acc, item) => {
      if (!acc[item.hari]) {
        acc[item.hari] = [];
      }
      acc[item.hari].push({
        id_jadwal: item.id_jadwal,
        jam_mulai: item.jam_mulai,
        jam_selesai: item.jam_selesai,
        kelas: item.kelasTahunAjaran?.id_kelas,
        pelajaran: item.kelasTahunAjaran?.id_pelajaran,
        guru: item.kelasTahunAjaran?.guru ? item.kelasTahunAjaran.guru.nama : null,
      });
      return acc;
    }, {});

    return res.status(200).send({ message: "success", jadwal: grouped });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== UPDATE JADWAL ==========================
router.put("/:id_jadwal", authenticateToken, authorizeRole(["Admin", "Guru"]), async (req, res) => {
  try {
    const { id_jadwal } = req.params;
    const jadwal = await JadwalPelajaran.findByPk(id_jadwal);

    if (!jadwal) {
      return res.status(404).send({ message: "Jadwal tidak ditemukan" });
    }

    const updateData = { ...req.body, updated_at: new Date() };

    await jadwal.update(updateData);

    return res.status(200).send({ message: "Jadwal berhasil diupdate", jadwal });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== DELETE JADWAL ==========================
router.delete("/:id_jadwal", authenticateToken, authorizeRole(["Admin", "Guru"]), async (req, res) => {
  try {
    const { id_jadwal } = req.params;
    const jadwal = await JadwalPelajaran.findByPk(id_jadwal);

    if (!jadwal) {
      return res.status(404).send({ message: "Jadwal tidak ditemukan" });
    }

    await jadwal.destroy();

    return res.status(200).send({ message: "Jadwal berhasil dihapus" });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

module.exports = router;
