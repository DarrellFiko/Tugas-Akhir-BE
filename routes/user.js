const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const nodemailer = require("nodemailer");
const { Op } = require("sequelize");

const User = require("../model/User");

// Import middleware
const {
  authenticateToken,
  authenticateTokenOptional,
  authorizeRole,
  addToBlacklist,
} = require("../middleware/auth");
const { uploadProfile } = require("../middleware/multer");

// ========================== HELPER VALIDASI ==========================
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
function isValidPhone(phone) {
  return /^\d{8,}$/.test(phone); // hanya angka, minimal 8 digit
}

// ========================== REGISTER SATU USER (Hanya Admin) ==========================
router.post(
  "/register",
  authenticateToken,
  authorizeRole("Admin"),
  uploadProfile.single("profile_picture"),
  async (req, res) => {
    try {
      const {
        nama,
        username,
        email,
        password,
        role,
        nis,
        nisn,
        gender,
        tgl_lahir,
        tempat_lahir,
        agama,
        alamat,
        nama_ayah,
        nama_ibu,
        telp,
        telp_ortu,
      } = req.body;

      if (!nama || !username || !email || !password || !role) {
        return res.status(400).send({ message: "Field wajib ada yang kosong" });
      }

      if (!isValidEmail(email)) {
        return res.status(400).send({ message: "Format email tidak valid" });
      }
      if (telp && !isValidPhone(telp)) {
        return res
          .status(400)
          .send({ message: "Nomor telepon tidak valid (min. 8 digit angka)" });
      }
      // if (telp_ortu && !isValidPhone(telp_ortu)) {
      //   return res.status(400).send({
      //     message: "Nomor telepon orang tua tidak valid (min. 8 digit angka)",
      //   });
      // }

      const existingUser = await User.findOne({
        where: {
          deleted_at: null,
          [Op.or]: [{ username }, { email }],
        },
      });
      if (existingUser) {
        return res
          .status(400)
          .send({ message: "Username atau email sudah digunakan" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      let profilePictureUrl = null;
      if (req.file) {
        profilePictureUrl = `${req.protocol}://${req.get(
          "host"
        )}/uploads/profile_pictures/${req.file.filename}`;
      }

      await User.create({
        nama,
        username,
        email,
        password: hashedPassword,
        role,
        nis,
        nisn,
        gender,
        tgl_lahir,
        tempat_lahir,
        agama,
        alamat,
        nama_ayah,
        nama_ibu,
        telp,
        telp_ortu,
        profile_picture: profilePictureUrl,
        status: 1,
      });

      return res.status(201).send({ message: "User berhasil didaftarkan" });
    } catch (err) {
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ========================== BULK REGISTER (Import Excel/CSV) ==========================
router.post(
  "/bulk-register",
  authenticateToken,
  authorizeRole("Admin"),
  async (req, res) => {
    try {
      const { users } = req.body;

      if (!users || !Array.isArray(users) || users.length === 0) {
        return res.status(400).send({ message: "Data users harus berupa array" });
      }

      for (const u of users) {
        if (!u.nama || !u.username || !u.email || !u.password || !u.role) {
          return res.status(400).send({
            message: `Field nama, username, email, password, dan role wajib diisi pada user dengan username: ${u.username}`,
          });
        }
        if (!isValidEmail(u.email)) {
          return res.status(400).send({
            message: `Format email tidak valid pada user: ${u.username}`,
          });
        }
        if (u.telp && !isValidPhone(u.telp)) {
          return res.status(400).send({
            message: `Nomor telepon tidak valid pada user: ${u.username}`,
          });
        }
        // if (u.telp_ortu && !isValidPhone(u.telp_ortu)) {
        //   return res.status(400).send({
        //     message: `Nomor telepon orang tua tidak valid pada user: ${u.username}`,
        //   });
        // }
      }

      const usernames = users.map((u) => u.username);
      const emails = users.map((u) => u.email);

      const existingUsers = await User.findAll({
        where: {
          deleted_at: null,
          [Op.or]: [
            { username: { [Op.in]: usernames } },
            { email: { [Op.in]: emails } },
          ],
        },
      });

      if (existingUsers.length > 0) {
        const conflict = existingUsers.map((u) => ({
          username: u.username,
          email: u.email,
        }));
        return res.status(400).send({
          message: "Beberapa username/email sudah digunakan",
          conflict,
        });
      }

      const processedUsers = await Promise.all(
        users.map(async (u) => {
          const { id, ...rest } = u;
          const hashedPassword = await bcrypt.hash(String(u.password), 10);
          return {
            ...rest,
            password: hashedPassword,
            profile_picture: u.profile_picture || null,
            status: 1,
          };
        })
      );

      const result = await User.bulkCreate(processedUsers);

      return res
        .status(201)
        .send({ message: `${result.length} user berhasil didaftarkan` });
    } catch (err) {
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ========================== UPDATE USER ==========================
router.put(
  "/:id_user",
  authenticateToken,
  uploadProfile.single("profile_picture"),
  async (req, res) => {
    try {
      const { id_user } = req.params;

      // Validasi hak akses
      if (
        req.user.role !== "Admin" &&
        req.user.id_user.toString() !== id_user.toString()
      ) {
        return res
          .status(403)
          .send({ message: "Tidak punya izin untuk update user ini" });
      }

      // Cek apakah user ada dan belum dihapus
      const user = await User.findOne({
        where: { id_user, deleted_at: null },
      });
      if (!user) {
        return res
          .status(404)
          .send({ message: "User tidak ditemukan atau sudah dihapus" });
      }

      const updateData = { ...req.body };

      // Validasi format input
      if (updateData.email && !isValidEmail(updateData.email)) {
        return res.status(400).send({ message: "Format email tidak valid" });
      }
      if (updateData.telp && !isValidPhone(updateData.telp)) {
        return res
          .status(400)
          .send({ message: "Nomor telepon tidak valid (min. 8 digit angka)" });
      }

      // Enkripsi password jika diupdate
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      // Validasi unik username
      if (updateData.username) {
        const existingUsername = await User.findOne({
          where: {
            username: updateData.username,
            id_user: { [Op.ne]: id_user },
            deleted_at: null, // hanya user aktif yang dicek
          },
        });

        if (existingUsername) {
          return res
            .status(400)
            .send({ message: "Username sudah digunakan oleh user lain" });
        }
      }

      // Validasi unik email
      if (updateData.email) {
        const existingEmail = await User.findOne({
          where: {
            email: updateData.email,
            id_user: { [Op.ne]: id_user },
            deleted_at: null, // hanya user aktif yang dicek
          },
        });

        if (existingEmail) {
          return res
            .status(400)
            .send({ message: "Email sudah digunakan oleh user lain" });
        }
      }

      // Upload foto profil jika ada
      if (req.file) {
        const profilePictureUrl = `${req.protocol}://${req.get(
          "host"
        )}/uploads/profile_pictures/${req.file.filename}`;
        updateData.profile_picture = profilePictureUrl;
      }

      // Simpan perubahan
      await user.update(updateData);

      return res.status(200).send({ message: "User berhasil diupdate" });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ========================== DELETE USER (Soft Delete) ==========================
router.delete(
  "/:id_user",
  authenticateToken,
  authorizeRole("Admin"),
  async (req, res) => {
    try {
      const { id_user } = req.params;

      const user = await User.findOne({
        where: { id_user, deleted_at: null },
      });
      if (!user) {
        return res
          .status(404)
          .send({ message: "User tidak ditemukan atau sudah dihapus" });
      }

      await user.update({ deleted_at: new Date() });

      return res.status(200).send({ message: "User berhasil dihapus" });
    } catch (err) {
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ========================== LOGIN ==========================
router.post("/login", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
      return res
        .status(400)
        .send({ message: "Username/email dan password wajib diisi" });
    }

    const whereClause = username ? { username } : { email };
    const user = await User.findOne({
      where: { ...whereClause, deleted_at: null },
    });

    if (!user)
      return res.status(404).send({ message: "Username tidak sesuai" });

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(400).send({ message: "Password tidak sesuai" });
    }

    const token = jwt.sign(
      { id_user: user.id_user, role: user.role, nama: user.nama },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );

    return res.status(200).send({
      message: "Login berhasil",
      token,
      nama: user.nama,
      role: user.role,
      profile_picture: user.profile_picture,
      id_user: user.id_user
    });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err });
  }
});

// ========================== LOGOUT ==========================
router.post("/logout", (req, res) => {
  try {
    const token = req.headers["authorization"]?.split(" ")[1];
    if (!token) return res.status(400).send({ message: "Token tidak ditemukan" });

    addToBlacklist(token);
    return res.status(200).send({ message: "Logout berhasil, token direset" });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err });
  }
});

// ========================== GET ROLE USER (via Token) ==========================
router.get("/role", authenticateTokenOptional, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(200).send({
        message: "User belum login",
        role: null,
      });
    }

    const id_user = parseInt(req.user.id_user, 10);

    const user = await User.findOne({
      where: { id_user, deleted_at: null },
      attributes: ["role"],
    });

    return res.status(200).send({
      message: "Success",
      role: user ? user.role.toLowerCase() : null,
    });
  } catch (err) {
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ========================== GET ID USER (via Token) ==========================
router.get("/id", authenticateToken, async (req, res) => {
  try {
    const id_user = parseInt(req.user.id_user, 10);

    const user = await User.findOne({
      where: { id_user, deleted_at: null },
      attributes: ["id_user"],
    });

    if (!user) {
      return res.status(404).send({
        message: "User tidak ditemukan atau sudah dihapus",
      });
    }

    return res.status(200).send({
      message: "Success",
      id_user: user.id_user,
    });
  } catch (err) {
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ========================== GET ALL USER (Hanya Admin) ==========================
router.get("/", authenticateToken, authorizeRole("Admin"), async (req, res) => {
  try {
    const users = await User.findAll({
      where: { deleted_at: null },
      attributes: { exclude: ["password", "otp_code", "otp_expires", "created_at", "updated_at", "deleted_at"], },
    });
    return res.status(200).send({ message: "success", data: users });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err });
  }
});

// ========================== GET USER PROFILE ==========================
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const id_user = parseInt(req.user.id_user, 10);
    const user = await User.findOne({
      where: { id_user, deleted_at: null },
      attributes: { exclude: ["password", "otp_code", "otp_expires", "created_at", "updated_at", "deleted_at"], },
    });

    if (!user)
      return res
        .status(404)
        .send({ message: "User tidak ditemukan atau sudah dihapus" });

    return res.status(200).send({ message: "success", data: user });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== GET USER LIST (id dan nama saja, untuk autocomplete) ==========================
router.get(
  "/simple",
  authenticateToken,
  async (req, res) => {
    try {
      const { role } = req.query; 

      const whereClause = { deleted_at: null };
      if (role) {
        whereClause.role = role;
      }

      const users = await User.findAll({
        where: whereClause,
        attributes: ["id_user", "nama", "role"],
      });

      return res.status(200).send({ message: "success", data: users });
    } catch (err) {
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ========================== GET USER BY ID ==========================
router.get("/:id_user", authenticateToken, async (req, res) => {
  try {
    const { id_user } = req.params;
    const user = await User.findOne({
      where: { id_user, deleted_at: null },
      attributes: {
        exclude: ["password", "otp_code", "otp_expires", "created_at", "updated_at", "deleted_at"],
      },
    });

    if (!user)
      return res
        .status(404)
        .send({ message: "User tidak ditemukan atau sudah dihapus" });

    return res.status(200).send({ message: "success", data: user });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err });
  }
});

// =============== REQUEST OTP (FORGOT PASSWORD) ===============
router.post("/request-otp", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id_user: req.user.id_user, deleted_at: null },
    });
    if (!user) return res.status(404).send({ message: "User tidak ditemukan" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await user.update({ otp_code: otp, otp_expires: expires });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Support App" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "OTP Reset Password",
      text: `Halo ${user.nama},\n\nKode OTP Anda adalah: ${otp}\nBerlaku 5 menit.\n\nTerima kasih.`,
    });

    return res
      .status(200)
      .send({ message: `OTP berhasil dikirim ke email ${user.email}` });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// =============== CHANGE PASSWORD WITH OTP ===============
router.post("/reset-password", authenticateToken, async (req, res) => {
  try {
    const { otp_code, new_password } = req.body;

    if (!otp_code || !new_password) {
      return res
        .status(400)
        .send({ message: "OTP dan password baru wajib diisi" });
    }

    const user = await User.findOne({
      where: { id_user: req.user.id_user, deleted_at: null },
    });
    if (!user) return res.status(404).send({ message: "User tidak ditemukan" });

    if (
      user.otp_code !== otp_code ||
      new Date() > new Date(user.otp_expires)
    ) {
      return res
        .status(400)
        .send({ message: "OTP tidak valid atau sudah kadaluarsa" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await user.update({
      password: hashedPassword,
      otp_code: null,
      otp_expires: null,
    });

    return res.status(200).send({ message: "Password berhasil direset" });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== REQUEST OTP (FORGOT PASSWORD) ==========================
router.post("/forgot-password/request-otp", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res
        .status(400)
        .send({ message: "Username atau email wajib diisi" });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }],
        deleted_at: null,
      },
    });

    if (!user) return res.status(404).send({ message: "User tidak ditemukan" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    await user.update({ otp_code: otp, otp_expires: expires });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Support App" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "OTP Reset Password",
      text: `Halo ${user.nama},\n\nKode OTP Anda adalah: ${otp}\nBerlaku selama 5 menit.\n\nTerima kasih.`,
    });

    return res
      .status(200)
      .send({ message: `OTP berhasil dikirim ke email ${user.email}` });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== CHANGE PASSWORD WITH OTP (FORGOT PASSWORD) ==========================
router.post("/forgot-password/change", async (req, res) => {
  try {
    const { username, otp_code } = req.body;
    if (!username || !otp_code) {
      return res
        .status(400)
        .send({ message: "Username/email dan OTP wajib diisi" });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }],
        deleted_at: null,
      },
    });

    if (!user) return res.status(404).send({ message: "User tidak ditemukan" });

    if (
      user.otp_code !== otp_code ||
      new Date() > new Date(user.otp_expires)
    ) {
      return res
        .status(400)
        .send({ message: "OTP tidak valid atau sudah kadaluarsa" });
    }

    const newPasswordPlain = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPasswordPlain, 10);

    await user.update({
      password: hashedPassword,
      otp_code: null,
      otp_expires: null,
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Support App" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Baru Anda",
      text: `Halo ${user.nama},\n\nPassword baru Anda adalah: ${newPasswordPlain}\nSilakan login menggunakan password ini dan segera ganti password Anda setelah login.\n\nTerima kasih.`,
    });

    return res
      .status(200)
      .send({ message: "Password baru berhasil dikirim ke email Anda" });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

module.exports = router;
