const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const Pengumuman = require("../model/Pengumuman");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const { uploadPengumuman } = require("../middleware/multer");

// Helper buat generate URL file
const getFileUrl = (req, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/pengumuman/${filename}`;
};

// ================== CREATE ==================
router.post(
  "/",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  uploadPengumuman.single("file"),
  async (req, res) => {
    try {
      const { judul, isi, id_kelas_tahun_ajaran } = req.body;

      if (!judul) {
        return res.status(400).send({ message: "Judul wajib diisi" });
      }

      const pengumuman = await Pengumuman.create({
        judul,
        isi,
        file: req.file ? req.file.filename : null,
        id_kelas_tahun_ajaran: id_kelas_tahun_ajaran || null,
      });

      return res.status(201).send({
        message: "Pengumuman berhasil dibuat",
        data: {
          ...pengumuman.toJSON(),
          file_url: getFileUrl(req, pengumuman.file),
        },
      });
    } catch (err) {
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
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
    } else {
      whereClause.id_kelas_tahun_ajaran = null; // default admin
    }

    const pengumuman = await Pengumuman.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
    });

    const withFileUrl = pengumuman.map((p) => ({
      ...p.toJSON(),
      file_url: getFileUrl(req, p.file),
    }));

    return res.status(200).send({ message: "success", data: withFileUrl });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== GET BY ID ==================
router.get("/:id_pengumuman", authenticateToken, async (req, res) => {
  try {
    const { id_pengumuman } = req.params;
    const pengumuman = await Pengumuman.findByPk(id_pengumuman);

    if (!pengumuman || pengumuman.deleted_at) {
      return res.status(404).send({ message: "Pengumuman tidak ditemukan" });
    }

    return res.status(200).send({
      message: "success",
      data: {
        ...pengumuman.toJSON(),
        file_url: getFileUrl(req, pengumuman.file),
      },
    });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== UPDATE ==================
router.put(
  "/:id_pengumuman",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  uploadPengumuman.single("file"),
  async (req, res) => {
    try {
      const { id_pengumuman } = req.params;
      const pengumuman = await Pengumuman.findByPk(id_pengumuman);

      if (!pengumuman || pengumuman.deleted_at) {
        return res.status(404).send({ message: "Pengumuman tidak ditemukan" });
      }

      const updateData = {
        judul: req.body.judul,
        isi: req.body.isi,
        updated_at: new Date(),
      };

      if (req.file) {
        // hapus file lama kalau ada
        if (pengumuman.file) {
          const oldFilePath = path.join(
            __dirname,
            "../uploads/pengumuman",
            pengumuman.file
          );
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
        updateData.file = req.file.filename;
      }

      await pengumuman.update(updateData);

      return res.status(200).send({
        message: "Pengumuman berhasil diupdate",
        data: {
          ...pengumuman.toJSON(),
          file_url: getFileUrl(req, pengumuman.file),
        },
      });
    } catch (err) {
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== DELETE (SOFT DELETE) ==================
router.delete(
  "/:id_pengumuman",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  async (req, res) => {
    try {
      const { id_pengumuman } = req.params;
      const pengumuman = await Pengumuman.findByPk(id_pengumuman);

      if (!pengumuman || pengumuman.deleted_at) {
        return res.status(404).send({ message: "Pengumuman tidak ditemukan" });
      }

      await pengumuman.update({ deleted_at: new Date(), status: 0 });

      return res
        .status(200)
        .send({ message: "Pengumuman berhasil dihapus (soft delete)" });
    } catch (err) {
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== DOWNLOAD FILE ==================
router.get("/download/:id_pengumuman", authenticateToken, async (req, res) => {
  try {
    const pengumuman = await Pengumuman.findByPk(req.params.id_pengumuman);

    if (!pengumuman || pengumuman.deleted_at) {
      return res.status(404).send({ message: "Pengumuman tidak ditemukan" });
    }
    if (!pengumuman.file) {
      return res.status(404).send({ message: "File tidak tersedia" });
    }

    const filePath = path.join(
      __dirname,
      "../uploads/pengumuman",
      pengumuman.file
    );
    return res.download(filePath, pengumuman.file);
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

module.exports = router;
