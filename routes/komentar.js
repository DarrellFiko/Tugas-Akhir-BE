const express = require("express");
const router = express.Router();
const Komentar = require("../model/Komentar");
const { authenticateToken } = require("../middleware/auth");

// ================== CREATE ==================
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { id_pengumuman, komentar } = req.body;
    const id_created_by = req.user?.id_user;

    if (!id_pengumuman || !komentar) {
      return res.status(400).send({
        message: "id_pengumuman dan komentar wajib diisi",
      });
    }

    if (!id_created_by) {
      return res.status(400).send({
        message: "id_created_by tidak ditemukan dari token",
      });
    }

    const newKomentar = await Komentar.create({
      id_pengumuman,
      komentar,
      id_created_by,
    });

    return res.status(201).send({
      message: "Komentar berhasil dibuat",
      data: newKomentar,
    });
  } catch (err) {
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ================== UPDATE ==================
router.put("/:id_komentar", authenticateToken, async (req, res) => {
  try {
    const { id_komentar } = req.params;
    const { komentar } = req.body;
    const id_created_by = req.user?.id_user;

    const komentarData = await Komentar.findByPk(id_komentar);

    if (!komentarData || komentarData.deleted_at) {
      return res.status(404).send({ message: "Komentar tidak ditemukan" });
    }

    // Validasi: hanya pemilik komentar yang bisa update
    if (komentarData.id_created_by !== id_created_by) {
      return res.status(403).send({ message: "Anda tidak berhak mengubah komentar ini" });
    }

    await komentarData.update({
      komentar: komentar || komentarData.komentar,
      updated_at: new Date(),
    });

    return res.status(200).send({
      message: "Komentar berhasil diupdate",
      data: komentarData,
    });
  } catch (err) {
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ================== DELETE (SOFT DELETE) ==================
router.delete("/:id_komentar", authenticateToken, async (req, res) => {
  try {
    const { id_komentar } = req.params;
    // const id_created_by = req.user?.id_user;

    const komentarData = await Komentar.findByPk(id_komentar);

    if (!komentarData || komentarData.deleted_at) {
      return res.status(404).send({ message: "Komentar tidak ditemukan" });
    }

    await komentarData.update({
      deleted_at: new Date(),
    });

    return res.status(200).send({
      message: "Komentar berhasil dihapus (soft delete)",
    });
  } catch (err) {
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

module.exports = router;
