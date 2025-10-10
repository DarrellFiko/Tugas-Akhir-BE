const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const { uploadRapor } = require("../middleware/multer");

const KelasSiswa = require("../model/KelasSiswa");
const KelasTahunAjaran = require("../model/KelasTahunAjaran");
const User = require("../model/User");
const Kelas = require("../model/Kelas");
const TahunAjaran = require("../model/TahunAjaran");

// Helper untuk file URL
const getFileUrl = (req, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/rapor/${filename}`;
};

// ================== CREATE ==================
router.post(
  "/",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  async (req, res) => {
    try {
      const { id_kelas, id_tahun_ajaran, id_siswa } = req.body;

      if (!id_kelas || !id_tahun_ajaran || !id_siswa) {
        return res.status(400).send({ message: "Semua data wajib diisi" });
      }

      const kelasSiswa = await KelasSiswa.create({
        id_kelas,
        id_tahun_ajaran,
        id_siswa,
      });

      return res.status(201).send({
        message: "Kelas siswa berhasil ditambahkan",
        data: kelasSiswa,
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== GET ALL ==================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { id_kelas, id_tahun_ajaran } = req.query;
    const whereClause = { deleted_at: null };

    if (id_kelas) whereClause.id_kelas = id_kelas;
    if (id_tahun_ajaran) whereClause.id_tahun_ajaran = id_tahun_ajaran;

    const data = await KelasSiswa.findAll({
      where: whereClause,
      include: [
        { model: User, as: "Siswa", attributes: ["id_user", "nama", "email"] },
        { model: Kelas, as: "Kelas", attributes: ["id_kelas", "nama_kelas"] },
        {
          model: TahunAjaran,
          as: "TahunAjaran",
          attributes: ["id_tahun_ajaran", "nama"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    const formatted = data.map((item) => {
      const plain = item.get({ plain: true });
      return {
        id_kelas_siswa: plain.id_kelas_siswa,
        siswa: plain.Siswa,
        kelas: plain.Kelas,
        tahunAjaran: plain.TahunAjaran,
        rapor_ganjil: getFileUrl(req, plain.rapor_ganjil),
        rapor_genap: getFileUrl(req, plain.rapor_genap),
      };
    });

    return res.status(200).send({ message: "success", data: formatted });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== GET LIST SISWA BERDASARKAN ID KELAS TAHUN AJARAN ==================
router.get("/list-siswa", authenticateToken, async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran } = req.query;

    if (!id_kelas_tahun_ajaran) {
      return res.status(400).send({ message: "Parameter id_kelas_tahun_ajaran wajib diisi" });
    }

    const kelasTahunAjaran = await KelasTahunAjaran.findOne({
      where: { id_kelas_tahun_ajaran, deleted_at: null },
      attributes: ["id_kelas", "id_tahun_ajaran"],
    });

    if (!kelasTahunAjaran) {
      return res.status(404).send({ message: "Kelas tahun ajaran tidak ditemukan" });
    }

    const siswaList = await KelasSiswa.findAll({
      where: {
        id_kelas: kelasTahunAjaran.id_kelas,
        id_tahun_ajaran: kelasTahunAjaran.id_tahun_ajaran,
        deleted_at: null,
      },
      include: [
        {
          model: User,
          as: "Siswa",
          attributes: ["id_user", "nis", "nisn", "nama"],
        },
      ],
      order: [[{ model: User, as: "Siswa" }, "nama", "ASC"]],
    });

    const data = siswaList.map((item) => ({
      id_user: item.Siswa.id_user,
      nis: item.Siswa.nis,
      nisn: item.Siswa.nisn,
      nama: item.Siswa.nama,
    }));

    return res.status(200).send({
      message: "success",
      data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ================== GET BY ID ==================
router.get("/:id_kelas_siswa", authenticateToken, async (req, res) => {
  try {
    const { id_kelas_siswa } = req.params;
    const data = await KelasSiswa.findByPk(id_kelas_siswa, {
      include: [
        { model: User, as: "Siswa", attributes: ["id_user", "nama", "email"] },
        { model: Kelas, as: "Kelas", attributes: ["id_kelas", "nama_kelas"] },
        {
          model: TahunAjaran,
          as: "TahunAjaran",
          attributes: ["id_tahun_ajaran", "nama"],
        },
      ],
    });

    if (!data || data.deleted_at) {
      return res.status(404).send({ message: "Data tidak ditemukan" });
    }

    const plain = data.get({ plain: true });
    const formatted = {
      id_kelas_siswa: plain.id_kelas_siswa,
      siswa: plain.Siswa,
      kelas: plain.Kelas,
      tahunAjaran: plain.TahunAjaran,
      rapor_ganjil: getFileUrl(req, plain.rapor_ganjil),
      rapor_genap: getFileUrl(req, plain.rapor_genap),
    };

    return res.status(200).send({ message: "success", data: formatted });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== UPLOAD RAPOR (GANJIL / GENAP) ==================
router.put(
  "/upload-rapor/:id_kelas_siswa/:tipe",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  uploadRapor.single("rapor"),
  async (req, res) => {
    try {
      const { id_kelas_siswa, tipe } = req.params;
      const kelasSiswa = await KelasSiswa.findByPk(id_kelas_siswa);

      if (!kelasSiswa || kelasSiswa.deleted_at) {
        return res.status(404).send({ message: "Data tidak ditemukan" });
      }

      if (!["ganjil", "genap"].includes(tipe)) {
        return res
          .status(400)
          .send({ message: "Tipe rapor harus ganjil atau genap" });
      }

      if (!req.file) {
        return res.status(400).send({ message: "File rapor wajib diupload" });
      }

      const fieldName = tipe === "ganjil" ? "rapor_ganjil" : "rapor_genap";

      // Hapus file lama jika ada
      if (kelasSiswa[fieldName]) {
        const oldPath = path.join(
          __dirname,
          "../uploads/rapor",
          kelasSiswa[fieldName]
        );
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      // Update ke DB
      await kelasSiswa.update({ [fieldName]: req.file.filename });

      return res.status(200).send({
        message: `Rapor ${tipe} berhasil diupload`,
        file_url: getFileUrl(req, req.file.filename),
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== DELETE (SOFT DELETE) ==================
router.delete(
  "/:id_kelas_siswa",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  async (req, res) => {
    try {
      const kelasSiswa = await KelasSiswa.findByPk(req.params.id_kelas_siswa);

      if (!kelasSiswa || kelasSiswa.deleted_at) {
        return res.status(404).send({ message: "Data tidak ditemukan" });
      }

      await kelasSiswa.update({ deleted_at: new Date() });

      return res
        .status(200)
        .send({ message: "Data berhasil dihapus (soft delete)" });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== DELETE RAPOR (GANJIL / GENAP) ==================
router.delete(
  "/delete-rapor/:id_kelas_siswa/:tipe",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  async (req, res) => {
    try {
      const { id_kelas_siswa, tipe } = req.params;
      const kelasSiswa = await KelasSiswa.findByPk(id_kelas_siswa);

      if (!kelasSiswa || kelasSiswa.deleted_at)
        return res.status(404).send({ message: "Data tidak ditemukan" });

      if (!["ganjil", "genap"].includes(tipe))
        return res.status(400).send({ message: "Tipe rapor tidak valid" });

      const fieldName = tipe === "ganjil" ? "rapor_ganjil" : "rapor_genap";

      // hapus file lama dari folder
      if (kelasSiswa[fieldName]) {
        const oldPath = path.join(__dirname, "../uploads/rapor", kelasSiswa[fieldName]);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      await kelasSiswa.update({ [fieldName]: null });

      return res.status(200).send({ message: `Rapor ${tipe} berhasil dihapus` });
    } catch (err) {
      return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

module.exports = router;
