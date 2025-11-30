const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const Materi = require("../model/Materi");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const { uploadMateri } = require("../middleware/multer");

// Helper buat generate URL file
const getFileUrl = (req, filename) => {
  if (!filename) return null;
  // return `https://${req.get("host")}/uploads/materi/${filename}`;
  return `${req.protocol}://${req.get("host")}/uploads/materi/${filename}`;
};

// ================== CREATE ==================
router.post(
  "/",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  uploadMateri.single("file"),
  async (req, res) => {
    try {
      const { nama_materi, pertemuan, deskripsi, id_kelas_tahun_ajaran } = req.body;

      if (!nama_materi || !pertemuan || !id_kelas_tahun_ajaran) {
        return res.status(400).send({
          message: "Nama, pertemuan, dan id_kelas_tahun_ajaran wajib diisi",
        });
      }

      const materi = await Materi.create({
        nama: nama_materi,
        pertemuan,
        deskripsi: deskripsi || null,
        file: req.file ? req.file.filename : null,
        id_kelas_tahun_ajaran,
      });

      return res.status(201).send({
        message: "Materi berhasil dibuat",
        data: {
          ...materi.toJSON(),
          file_url: getFileUrl(req, materi.file),
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== GET ALL ==================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran } = req.query;
    let whereClause = { deleted_at: null };

    if (id_kelas_tahun_ajaran) {
      whereClause.id_kelas_tahun_ajaran = id_kelas_tahun_ajaran;
    }

    const materi = await Materi.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
    });

    const result = materi.map((m) => ({
      ...m.toJSON(),
      file_url: getFileUrl(req, m.file),
    }));

    return res.status(200).send({ message: "success", data: result });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== GET BY ID ==================
router.get("/:id_materi", authenticateToken, async (req, res) => {
  try {
    const { id_materi } = req.params;
    const materi = await Materi.findByPk(id_materi);

    if (!materi || materi.deleted_at) {
      return res.status(404).send({ message: "Materi tidak ditemukan" });
    }

    return res.status(200).send({
      message: "success",
      data: {
        ...materi.toJSON(),
        file_url: getFileUrl(req, materi.file),
      },
    });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== UPDATE ==================
router.put(
  "/:id_materi",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  uploadMateri.single("file"),
  async (req, res) => {
    try {
      const { id_materi } = req.params;
      const materi = await Materi.findByPk(id_materi);

      if (!materi || materi.deleted_at) {
        return res.status(404).send({ message: "Materi tidak ditemukan" });
      }

      const updateData = {
        nama: req.body.nama_materi,
        pertemuan: req.body.pertemuan,
        deskripsi: req.body.deskripsi,
        updated_at: new Date(),
      };

      if (req.file) {
        // hapus file lama jika ada
        if (materi.file) {
          const oldFilePath = path.join(__dirname, "../uploads/materi", materi.file);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        updateData.file = req.file.filename;
      }

      await materi.update(updateData);

      return res.status(200).send({
        message: "Materi berhasil diperbarui",
        data: {
          ...materi.toJSON(),
          file_url: getFileUrl(req, materi.file),
        },
      });
    } catch (err) {
      return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== DELETE (SOFT DELETE) ==================
router.delete(
  "/:id_materi",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  async (req, res) => {
    try {
      const { id_materi } = req.params;
      const materi = await Materi.findByPk(id_materi);

      if (!materi || materi.deleted_at) {
        return res.status(404).send({ message: "Materi tidak ditemukan" });
      }

      await materi.update({ deleted_at: new Date() });

      return res.status(200).send({ message: "Materi berhasil dihapus (soft delete)" });
    } catch (err) {
      return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== DOWNLOAD FILE ==================
router.get("/download/:id_materi", authenticateToken, async (req, res) => {
  try {
    const materi = await Materi.findByPk(req.params.id_materi);

    if (!materi || materi.deleted_at) {
      return res.status(404).send({ message: "Materi tidak ditemukan" });
    }
    if (!materi.file) {
      return res.status(404).send({ message: "File tidak tersedia" });
    }

    const filePath = path.join(__dirname, "../uploads/materi", materi.file);
    return res.download(filePath, materi.file);
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

module.exports = router;
