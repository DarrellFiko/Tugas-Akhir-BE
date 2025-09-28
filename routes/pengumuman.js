const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const Pengumuman = require("../model/Pengumuman");
const User = require("../model/User");
const KelasTahunAjaran = require("../model/KelasTahunAjaran");

const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/auth");

// import upload khusus pengumuman
const { uploadPengumuman } = require("../middleware/multer");

// ========================== CREATE PENGUMUMAN (Admin/Guru) ==========================
router.post("/", authenticateToken, authorizeRole(["Admin", "Guru"]), uploadPengumuman.single("file"), async (req, res) => {
  try {
    const { judul, isi, id_kelas_tahun_ajaran } = req.body;

    if (!judul) {
      return res.status(400).send({ message: "Judul wajib diisi" });
    }

    let fileUrl = null;
    if (req.file) {
      fileUrl = `${req.protocol}://${req.get("host")}/uploads/pengumuman/${req.file.filename}`;
    }

    const pengumuman = await Pengumuman.create({
      judul,
      isi,
      file: fileUrl,
      id_kelas_tahun_ajaran: id_kelas_tahun_ajaran || null,
      created_by: req.user.id_user,
      created_at: new Date(),
      status: 1,
    });

    return res
      .status(201)
      .send({ message: "Pengumuman berhasil dibuat", pengumuman });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== GET ALL PENGUMUMAN ==========================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const pengumuman = await Pengumuman.findAll({
      where: { deleted_at: null },
      include: [
        { model: User, as: "creator", attributes: ["id_user", "nama", "role"] },
        { model: User, as: "updater", attributes: ["id_user", "nama", "role"] },
        {
          model: KelasTahunAjaran,
          as: "kelasTahunAjaran",
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return res.status(200).send({ message: "success", pengumuman });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== GET PENGUMUMAN BY ID ==========================
router.get("/:id_pengumuman", authenticateToken, async (req, res) => {
  try {
    const { id_pengumuman } = req.params;

    const pengumuman = await Pengumuman.findByPk(id_pengumuman, {
      include: [
        { model: User, as: "creator", attributes: ["id_user", "nama", "role"] },
        { model: User, as: "updater", attributes: ["id_user", "nama", "role"] },
        {
          model: KelasTahunAjaran,
          as: "kelasTahunAjaran",
        },
      ],
    });

    if (!pengumuman || pengumuman.deleted_at) {
      return res.status(404).send({ message: "Pengumuman tidak ditemukan" });
    }

    return res.status(200).send({ message: "success", pengumuman });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== UPDATE PENGUMUMAN ==========================
router.put("/:id_pengumuman", authenticateToken, authorizeRole(["Admin", "Guru"]), uploadPengumuman.single("file"), async (req, res) => {
  try {
    const { id_pengumuman } = req.params;
    const pengumuman = await Pengumuman.findByPk(id_pengumuman);

    if (!pengumuman || pengumuman.deleted_at) {
      return res.status(404).send({ message: "Pengumuman tidak ditemukan" });
    }

    // hanya creator atau admin yang bisa update
    if (
      req.user.role !== "Admin" &&
      req.user.id_user !== pengumuman.created_by
    ) {
      return res
        .status(403)
        .send({ message: "Tidak punya izin untuk update pengumuman ini" });
    }

    const updateData = {
      ...req.body,
      updated_by: req.user.id_user,
      updated_at: new Date(),
    };

    if (req.file) {
      updateData.file = `${req.protocol}://${req.get(
        "host"
      )}/uploads/pengumuman/${req.file.filename}`;
    }

    await pengumuman.update(updateData);

    return res
      .status(200)
      .send({ message: "Pengumuman berhasil diupdate", pengumuman });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== DELETE (SOFT DELETE) PENGUMUMAN ==========================
router.delete("/:id_pengumuman", authenticateToken, authorizeRole(["Admin", "Guru"]), async (req, res) => {
  try {
    const { id_pengumuman } = req.params;
    const pengumuman = await Pengumuman.findByPk(id_pengumuman);

    if (!pengumuman || pengumuman.deleted_at) {
      return res.status(404).send({ message: "Pengumuman tidak ditemukan" });
    }

    // hanya creator atau admin yang bisa delete
    if (
      req.user.role !== "Admin" &&
      req.user.id_user !== pengumuman.created_by
    ) {
      return res
        .status(403)
        .send({ message: "Tidak punya izin untuk menghapus pengumuman ini" });
    }

    await pengumuman.update({
      deleted_at: new Date(),
      status: 0,
      updated_by: req.user.id_user,
    });

    return res
      .status(200)
      .send({ message: "Pengumuman berhasil dihapus (soft delete)" });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

module.exports = router;
