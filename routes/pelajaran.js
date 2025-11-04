const express = require("express");
const router = express.Router();

const Pelajaran = require("../model/Pelajaran");
const JadwalPelajaran = require("../model/JadwalPelajaran");
const KelasTahunAjaran = require("../model/KelasTahunAjaran");
const Modul = require("../model/Modul");
const Pengumuman = require("../model/Pengumuman");
const Materi = require("../model/Materi");
const BeritaAcara = require("../model/BeritaAcara");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// ========================== CREATE ==========================
router.post(
  "/",
  authenticateToken,
  authorizeRole(["Admin"]),
  async (req, res) => {
    try {
      const { nama_pelajaran, kode_pelajaran } = req.body;

      if (!nama_pelajaran) {
        return res.status(400).send({ message: "Nama pelajaran wajib diisi" });
      }

      const pelajaran = await Pelajaran.create({
        nama_pelajaran,
        kode_pelajaran: kode_pelajaran || null, // boleh null
        created_at: new Date(),
        updated_at: new Date(),
      });

      return res
        .status(201)
        .send({ message: "Pelajaran berhasil dibuat", pelajaran });
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
    const pelajaran = await Pelajaran.findAll({
      attributes: { exclude: ["deleted_at"] },
    });

    res.json({
      message: "Berhasil ambil data pelajaran",
      data: pelajaran,
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
    const pelajaran = await Pelajaran.findAll({
      attributes: ["id_pelajaran", "nama_pelajaran"],
      order: [["nama_pelajaran", "ASC"]],
    });

    return res.status(200).send({
      message: "success",
      data: pelajaran,
    });
  } catch (err) {
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ========================== GET BY ID ==========================
router.get("/:id_pelajaran", authenticateToken, async (req, res) => {
  try {
    const { id_pelajaran } = req.params;
    const pelajaran = await Pelajaran.findByPk(id_pelajaran);

    if (!pelajaran) {
      return res.status(404).send({ message: "Pelajaran tidak ditemukan" });
    }

    return res.status(200).send({ message: "success", data: pelajaran });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== UPDATE ==========================
router.put(
  "/:id_pelajaran",
  authenticateToken,
  authorizeRole(["Admin"]),
  async (req, res) => {
    try {
      const { id_pelajaran } = req.params;
      const pelajaran = await Pelajaran.findByPk(id_pelajaran);

      if (!pelajaran) {
        return res.status(404).send({ message: "Pelajaran tidak ditemukan" });
      }

      const updateData = {
        ...req.body,
        updated_at: new Date(),
      };

      await pelajaran.update(updateData);

      return res
        .status(200)
        .send({ message: "Pelajaran berhasil diupdate", pelajaran });
    } catch (err) {
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ========================== DELETE ==========================
router.delete(
  "/:id_pelajaran",
  authenticateToken,
  authorizeRole(["Admin"]),
  async (req, res) => {
    try {
      const { id_pelajaran } = req.params;

      // Cek apakah pelajaran ada
      const pelajaran = await Pelajaran.findByPk(id_pelajaran);
      if (!pelajaran) {
        return res.status(404).send({ message: "Pelajaran tidak ditemukan" });
      }

      // Ambil semua kelas_tahun_ajaran yang memakai pelajaran ini
      const kelasTahunAjaranList = await KelasTahunAjaran.findAll({
        where: { id_pelajaran },
        attributes: ["id_kelas_tahun_ajaran"],
      });

      // Ambil semua id_kelas_tahun_ajaran-nya
      const idKelasTahunAjaranList = kelasTahunAjaranList.map(
        (item) => item.id_kelas_tahun_ajaran
      );

      // Kalau ada relasi
      if (idKelasTahunAjaranList.length > 0) {
        // Hapus pengumuman yang terkait
        await Pengumuman.destroy({
          where: { id_kelas_tahun_ajaran: idKelasTahunAjaranList },
        });

        // Hapus materi
        await Materi.destroy({
          where: { id_kelas_tahun_ajaran: idKelasTahunAjaranList },
        });

        // Hapus modul
        await Modul.destroy({
          where: { id_kelas_tahun_ajaran: idKelasTahunAjaranList },
        });

        // Hapus jadwal pelajaran
        await JadwalPelajaran.destroy({
          where: { id_kelas_tahun_ajaran: idKelasTahunAjaranList },
        });

        // Hapus berita acara (jika ada)
        await BeritaAcara.destroy({
          where: { id_kelas_tahun_ajaran: idKelasTahunAjaranList },
        });

        // Terakhir, hapus kelas_tahun_ajaran
        await KelasTahunAjaran.destroy({
          where: { id_pelajaran },
        });
      }

      // 5️⃣ Hapus pelajaran itu sendiri
      await pelajaran.destroy();

      return res.status(200).send({
        message:
          "Pelajaran dan semua data terkait (pengumuman, materi, modul, ujian, nilai, jadwal pelajaran, kelas tahun ajaran) berhasil dihapus",
      });
    } catch (err) {
      return res.status(500).send({
        message: "Terjadi kesalahan saat menghapus pelajaran",
        error: err.message,
      });
    }
  }
);

module.exports = router;
