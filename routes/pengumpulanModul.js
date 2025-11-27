const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const PengumpulanModul = require("../model/PengumpulanModul");
const Modul = require("../model/Modul");
const User = require("../model/User");
const { uploadPengumpulanModul } = require("../middleware/multer");
const archiver = require("archiver");

// Helper URL file
const getFileUrl = (req, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/pengumpulan_modul/${filename}`;
};

// ================== CREATE OR UPDATE ==================
router.post(
  "/",
  authenticateToken,
  authorizeRole(["Siswa"]),
  uploadPengumpulanModul.single("file_pengumpulan"),
  async (req, res) => {
    try {
      const { id_modul } = req.body;
      const id_siswa = req.user.id_user;

      // Validasi input
      if (!id_modul) {
        return res.status(400).send({ message: "id_modul wajib diisi" });
      }

      if (!req.file) {
        return res.status(400).send({ message: "File wajib diupload" });
      }

      // Cek modul
      const modul = await Modul.findByPk(id_modul);
      if (!modul || modul.deleted_at) {
        return res.status(404).send({ message: "Modul tidak ditemukan" });
      }

      // Cek apakah siswa sudah pernah mengumpulkan
      const existing = await PengumpulanModul.findOne({
        where: { id_modul, id_siswa, deleted_at: null },
      });

      // Jika sudah ada hapus file lama dan update file baru
      if (existing) {
        if (existing.file_pengumpulan) {
          const oldFile = path.join(
            __dirname,
            "../uploads/pengumpulan_modul",
            existing.file_pengumpulan
          );
          if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
        }

        await existing.update({
          file_pengumpulan: req.file.filename,
          updated_at: new Date(),
        });

        return res.status(200).send({
          message: "File pengumpulan berhasil diperbarui",
          data: {
            ...existing.toJSON(),
            file_url: getFileUrl(req, existing.file_pengumpulan),
          },
        });
      }

      // Jika belum pernah mengumpulkan buat baru
      const newData = await PengumpulanModul.create({
        id_modul,
        id_siswa,
        file_pengumpulan: req.file.filename,
      });

      return res.status(201).send({
        message: "Pengumpulan modul berhasil dibuat",
        data: {
          ...newData.toJSON(),
          file_url: getFileUrl(req, newData.file_pengumpulan),
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).send({
        message: "Terjadi kesalahan saat pengumpulan modul",
        error: err.message,
      });
    }
  }
);

// ================== GET ALL ==================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { id_modul } = req.query;
    const whereClause = { deleted_at: null };

    if (id_modul) whereClause.id_modul = id_modul;

    const data = await PengumpulanModul.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
      include: [
        {
          model: User,
          attributes: ["id_user", "nama", "email"],
          as: "siswa",
        },
        {
          model: Modul,
          attributes: ["id_modul", "nama_modul", "jenis_modul"],
          as: "modul",
        },
      ],
    });

    const mapped = data.map((p) => ({
      ...p.toJSON(),
      file_url: getFileUrl(req, p.file_pengumpulan),
    }));

    return res.status(200).send({ message: "success", data: mapped });
  } catch (err) {
    console.error(err);
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ================== GET BY ID ==================
router.get("/:id_pengumpulan_modul", authenticateToken, async (req, res) => {
  try {
    const { id_pengumpulan_modul } = req.params;

    const data = await PengumpulanModul.findByPk(id_pengumpulan_modul, {
      include: [
        {
          model: User,
          attributes: ["id_user", "nama"],
          as: "siswa",
        },
        {
          model: Modul,
          attributes: ["id_modul", "nama_modul"],
          as: "modul",
        },
      ],
    });

    if (!data || data.deleted_at) {
      return res.status(404).send({ message: "Data pengumpulan tidak ditemukan" });
    }

    return res.status(200).send({
      message: "success",
      data: {
        ...data.toJSON(),
        file_url: getFileUrl(req, data.file_pengumpulan),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ================== DELETE (SOFT DELETE) ==================
router.delete(
  "/:id_pengumpulan_modul",
  authenticateToken,
  authorizeRole(["Siswa", "Guru", "Admin"]),
  async (req, res) => {
    try {
      const { id_pengumpulan_modul } = req.params;
      const pengumpulan = await PengumpulanModul.findByPk(id_pengumpulan_modul);

      if (!pengumpulan || pengumpulan.deleted_at) {
        return res.status(404).send({ message: "Data tidak ditemukan" });
      }

      if (
        req.user.role === "Siswa" &&
        pengumpulan.id_siswa !== req.user.id_user
      ) {
        return res.status(403).send({
          message: "Tidak dapat menghapus data milik orang lain",
        });
      }

      await pengumpulan.update({ deleted_at: new Date() });

      return res
        .status(200)
        .send({ message: "Data pengumpulan berhasil dihapus (soft delete)" });
    } catch (err) {
      console.error(err);
      return res.status(500).send({
        message: "Terjadi kesalahan saat menghapus data",
        error: err.message,
      });
    }
  }
);

// ================== DOWNLOAD FILE ==================
router.get("/download/:id_pengumpulan_modul", authenticateToken, async (req, res) => {
  try {
    const pengumpulan = await PengumpulanModul.findByPk(req.params.id_pengumpulan_modul);

    if (!pengumpulan || pengumpulan.deleted_at) {
      return res.status(404).send({ message: "Data tidak ditemukan" });
    }

    if (!pengumpulan.file_pengumpulan) {
      return res.status(404).send({ message: "File tidak tersedia" });
    }

    const filePath = path.join(
      __dirname,
      "../uploads/pengumpulan_modul",
      pengumpulan.file_pengumpulan
    );
    return res.download(filePath, pengumpulan.file_pengumpulan);
  } catch (err) {
    console.error(err);
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ================== DOWNLOAD SEMUA PENGUMPULAN (ZIP) ==================
// router.get(
//   "/download-zip/:id_modul",
//   authenticateToken,
//   authorizeRole(["Guru", "Admin"]),
//   async (req, res) => {
//     try {
//       const { id_modul } = req.params;

//       const modul = await Modul.findByPk(id_modul);
//       if (!modul || modul.deleted_at) {
//         return res.status(404).send({ message: "Modul tidak ditemukan" });
//       }

//       // Ambil semua file pengumpulan berdasarkan id_modul
//       const pengumpulanList = await PengumpulanModul.findAll({
//         where: { id_modul, deleted_at: null },
//         include: [{ model: User, as: "siswa", attributes: ["nama"] }],
//       });

//       if (pengumpulanList.length === 0) {
//         return res.status(400).send({ message: "Belum ada pengumpulan untuk modul ini" });
//       }

//       // Siapkan response sebagai zip
//       res.setHeader("Content-Disposition", `attachment; filename="modul_${id_modul}_pengumpulan.zip"`);
//       res.setHeader("Content-Type", "application/zip");

//       const archive = archiver("zip", { zlib: { level: 9 } });
//       archive.pipe(res);

//       pengumpulanList.forEach((item) => {
//         if (item.file_pengumpulan) {
//           const filePath = path.join(__dirname, "../uploads/pengumpulan_modul", item.file_pengumpulan);
//           if (fs.existsSync(filePath)) {
//             // Gunakan nama file siswa agar mudah dibedakan
//             const safeName = item.siswa?.nama?.replace(/[^a-zA-Z0-9_\-]/g, "_") || `siswa_${item.id_siswa}`;
//             archive.file(filePath, { name: `${safeName}_${item.file_pengumpulan}` });
//           }
//         }
//       });

//       archive.finalize();
//     } catch (err) {
//       console.error(err);
//       return res.status(500).send({
//         message: "Terjadi kesalahan saat membuat ZIP",
//         error: err.message,
//       });
//     }
//   }
// );

// ================== DOWNLOAD SEMUA PENGUMPULAN (ZIP) - OPTIMIZED ==================
router.get(
  "/download-zip/:id_modul",
  authenticateToken,
  authorizeRole(["Guru", "Admin"]),
  async (req, res) => {
    try {
      const { id_modul } = req.params;

      const modul = await Modul.findByPk(id_modul);
      if (!modul || modul.deleted_at) {
        return res.status(404).json({ message: "Modul tidak ditemukan" });
      }

      const pengumpulanList = await PengumpulanModul.findAll({
        where: { id_modul, deleted_at: null },
        include: [{ model: User, as: "siswa", attributes: ["nama"] }],
      });

      if (pengumpulanList.length === 0) {
        return res.status(400).json({ message: "Belum ada pengumpulan untuk modul ini" });
      }

      // Header ZIP
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="modul_${id_modul}_pengumpulan.zip"`
      );
      res.setHeader("Content-Type", "application/zip");

      const archive = archiver("zip", {
        zlib: { level: 9 },
        highWaterMark: 1024 * 1024 * 4, // 4MB buffer (lebih cepat)
      });

      archive.on("error", (err) => res.status(500).send({ message: err.message }));

      archive.pipe(res);

      // ========== OPTIMIZED FILE ATTACHING ==========

      const fsPromises = fs.promises;

      // Check file secara paralel agar lebih cepat
      await Promise.all(
        pengumpulanList.map(async (item) => {
          if (!item.file_pengumpulan) return;

          const filePath = path.join(
            __dirname,
            "../uploads/pengumpulan_modul",
            item.file_pengumpulan
          );

          try {
            await fsPromises.access(filePath); // async (lebih cepat)
            const safeName =
              item.siswa?.nama?.replace(/[^a-zA-Z0-9_\-]/g, "_") ||
              `siswa_${item.id_siswa}`;

            archive.file(filePath, {
              name: `${safeName}_${item.file_pengumpulan}`,
            });
          } catch {
            console.warn(`File tidak ditemukan: ${filePath}`);
          }
        })
      );

      // Finalize ZIP
      archive.finalize();
    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Terjadi kesalahan saat membuat ZIP",
        error: err.message,
      });
    }
  }
);


module.exports = router;
