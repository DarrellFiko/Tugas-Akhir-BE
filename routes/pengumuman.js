const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const Pengumuman = require("../model/Pengumuman");
const Komentar = require("../model/Komentar");
const User = require("../model/User");
const KelasTahunAjaran = require("../model/KelasTahunAjaran");
const KelasSiswa = require("../model/KelasSiswa");
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
      let { role, id_user, nama } = req.user;

      if (!judul) {
        return res.status(400).send({ message: "Judul wajib diisi" });
      }

      // Validasi file jika admin
      if (role.toLowerCase() === "admin" && !req.file) {
        return res.status(400).send({
          message: "File wajib diupload untuk Admin",
        });
      }

      // Buat pengumuman
      const pengumuman = await Pengumuman.create({
        judul,
        isi,
        file: req.file ? req.file.filename : null,
        id_kelas_tahun_ajaran: id_kelas_tahun_ajaran || null,
      });

      // Kirim email notifikasi
      const transporter = require("nodemailer").createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      let targetEmails = [];

      if (role.toLowerCase() === "admin") {
        // Admin kirim ke semua user
        const allUsers = await User.findAll({
          where: { deleted_at: null },
          attributes: ["email"],
        });
        targetEmails = allUsers.map((u) => u.email).filter(Boolean);
        nama = "SMA Santo Carolus";
      } else if (role.toLowerCase() === "guru" && id_kelas_tahun_ajaran) {
        // Guru kirim ke siswa kelasnya
        const kelasTahun = await KelasTahunAjaran.findByPk(id_kelas_tahun_ajaran);
        if (kelasTahun) {
          const siswaKelas = await KelasSiswa.findAll({
            where: {
              id_kelas: kelasTahun.id_kelas,
              id_tahun_ajaran: kelasTahun.id_tahun_ajaran,
              deleted_at: null,
            },
            include: [{ model: User, attributes: ["email"], as: "Siswa" }],
          });
          targetEmails = siswaKelas.map((ks) => ks.Siswa?.email).filter(Boolean);
        }
      }

      if (targetEmails.length > 0) {
        const mailOptions = {
          from: `"SMA Santo Carolus" <${process.env.EMAIL_USER}>`,
          bcc: targetEmails,
          subject: `Pengumuman Baru: ${judul}`,
          html: `
            <div style="background-color:#E3F2FD;padding:20px;border-radius:8px;font-family:'Segoe UI',sans-serif;text-align:center;">
              <h2 style="color:#1976D2;">Pengumuman Baru</h2>
              <p style="font-size:15px;color:#333;">${nama} telah mengunggah pengumuman baru di sistem E-Class:</p>

              <div style="background:#fff;border-radius:6px;padding:20px;margin:20px auto;max-width:500px;text-align:center;">
                <h3 style="color:#1976D2;margin-top:0;">${judul}</h3>
                <p style="color:#555;white-space:pre-line;">${isi}</p>
                ${
                  pengumuman.file
                    ? `<p><a href="${getFileUrl(req, pengumuman.file)}" style="display:inline-block;margin-top:10px;background-color:#1976D2;color:white;padding:10px 16px;border-radius:5px;text-decoration:none;">Lihat Lampiran</a></p>`
                    : ""
                }
              </div>

              <p style="margin-top:20px;color:#666;">Silakan masuk ke aplikasi <strong>E-Class SMA Santo Carolus</strong> untuk melihat detail lebih lanjut.</p>
              <hr style="margin-top:20px;border:none;border-top:1px solid #BBDEFB;width:80%;margin:auto;">
              <p style="color:#90A4AE;font-size:12px;">Email ini dikirim otomatis oleh sistem. Mohon tidak membalas.</p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
      }

      return res.status(201).send({
        message: "Pengumuman berhasil dibuat dan notifikasi dikirim",
        data: {
          ...pengumuman.toJSON(),
          file_url: getFileUrl(req, pengumuman.file),
        },
      });
    } catch (err) {
      console.error("CREATE ERROR:", err);
      return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== UPDATE ==================
router.put(
  "/:id_pengumuman",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  uploadPengumuman.single("file"),
  async (req, res) => {
    try {
      const { id_pengumuman } = req.params;
      const { role, nama } = req.user;
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
        if (pengumuman.file) {
          const oldFilePath = path.join(__dirname, "../uploads/pengumuman", pengumuman.file);
          if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
        }
        updateData.file = req.file.filename;
      }

      await pengumuman.update(updateData);

      // === Kirim email notifikasi update ===
      const transporter = require("nodemailer").createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      let targetEmails = [];

      if (role.toLowerCase() === "admin") {
        const allUsers = await User.findAll({
          where: { deleted_at: null },
          attributes: ["email"],
        });
        targetEmails = allUsers.map((u) => u.email).filter(Boolean);
      } else if (role.toLowerCase() === "guru" && pengumuman.id_kelas_tahun_ajaran) {
        const kelasTahun = await KelasTahunAjaran.findByPk(pengumuman.id_kelas_tahun_ajaran);
        if (kelasTahun) {
          const siswaKelas = await KelasSiswa.findAll({
            where: {
              id_kelas: kelasTahun.id_kelas,
              id_tahun_ajaran: kelasTahun.id_tahun_ajaran,
              deleted_at: null,
            },
            include: [{ model: User, attributes: ["email"], as: "Siswa" }],
          });
          targetEmails = siswaKelas.map((ks) => ks.Siswa?.email).filter(Boolean);
        }
      }

      if (targetEmails.length > 0) {
        const mailOptions = {
          from: `"SMA Santo Carolus" <${process.env.EMAIL_USER}>`,
          bcc: targetEmails,
          subject: `Pengumuman Diperbarui: ${updateData.judul}`,
          html: `
            <div style="background-color:#E3F2FD;padding:20px;border-radius:8px;font-family:'Segoe UI',sans-serif;text-align:center;">
              <h2 style="color:#1976D2;">Pengumuman Diperbarui</h2>
              <p style="font-size:15px;color:#333;">${nama} telah memperbarui pengumuman berikut:</p>

              <div style="background:#fff;border-radius:6px;padding:20px;margin:20px auto;max-width:500px;text-align:center;">
                <h3 style="color:#1976D2;margin-top:0;">${updateData.judul}</h3>
                <p style="color:#555;white-space:pre-line;">${updateData.isi}</p>
                ${
                  pengumuman.file
                    ? `<p><a href="${getFileUrl(req, pengumuman.file)}" style="display:inline-block;margin-top:10px;background-color:#1976D2;color:white;padding:10px 16px;border-radius:5px;text-decoration:none;">Lihat Lampiran</a></p>`
                    : ""
                }
              </div>

              <p style="margin-top:20px;color:#666;">Cek kembali di <strong>E-Class SMA Santo Carolus</strong> untuk detail lengkap.</p>
              <hr style="margin-top:20px;border:none;border-top:1px solid #BBDEFB;width:80%;margin:auto;">
              <p style="color:#90A4AE;font-size:12px;">Email ini dikirim otomatis oleh sistem. Mohon tidak membalas.</p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
      }

      return res.status(200).send({
        message: "Pengumuman berhasil diupdate dan notifikasi dikirim",
        data: {
          ...pengumuman.toJSON(),
          file_url: getFileUrl(req, pengumuman.file),
        },
      });
    } catch (err) {
      console.error("UPDATE ERROR:", err);
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
    } else {
      whereClause.id_kelas_tahun_ajaran = null;
    }

    const pengumuman = await Pengumuman.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
    });

    const withFileUrl = await Promise.all(
      pengumuman.map(async (p) => {
        const komentar = await Komentar.findAll({
          where: { id_pengumuman: p.id_pengumuman, deleted_at: null },
          order: [["created_at", "ASC"]],
          include: [
            {
              model: User,
              attributes: ["id_user", "nama"],
              as: "user",
            },
          ],
        });

        return {
          ...p.toJSON(),
          file_url: getFileUrl(req, p.file),
          komentar: komentar.map((k) => ({
            ...k.toJSON(),
            created_by: k.user ? k.user.nama : null,
            canAction: req.user.id_user === k.id_created_by,
          })),
        };
      })
    );

    return res.status(200).send({ message: "success", data: withFileUrl });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
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

    const komentar = await Komentar.findAll({
      where: { id_pengumuman, deleted_at: null },
      order: [["created_at", "ASC"]],
      include: [
        {
          model: User,
          attributes: ["id_user", "nama"],
          as: "user",
        },
      ],
    });

    return res.status(200).send({
      message: "success",
      data: {
        ...pengumuman.toJSON(),
        file_url: getFileUrl(req, pengumuman.file),
        komentar: komentar.map((k) => ({
          ...k.toJSON(),
          created_by: k.user ? k.user.nama : null,
          canAction: req.user.id_user === k.id_created_by,
        })),
      },
    });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

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

      // Soft delete semua komentar yang terkait dengan pengumuman ini
      await Komentar.update(
        { deleted_at: new Date() },
        { where: { id_pengumuman } }
      );

      // Soft delete pengumuman
      await pengumuman.update({
        deleted_at: new Date(),
        status: 0,
      });

      return res.status(200).send({
        message: "Pengumuman dan semua komentar terkait berhasil dihapus (soft delete)",
      });
    } catch (err) {
      return res.status(500).send({
        message: "Terjadi kesalahan saat menghapus pengumuman",
        error: err.message,
      });
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
