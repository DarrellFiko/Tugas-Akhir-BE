const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const nodemailer = require("nodemailer");

const User = require("../model/User");

// Import middleware
const {
  authenticateToken,
  authorizeRole,
  addToBlacklist,
} = require("../middleware/auth");
const { uploadProfile } = require("../middleware/multer");
const { Op } = require("sequelize");

// ========================== REGISTER SATU USER (Hanya Admin) ==========================
router.post("/register", authenticateToken, authorizeRole("Admin"), uploadProfile.single("profile_picture"), async (req, res) => {
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
      return res
        .status(400)
        .send({ message: "Field wajib ada yang kosong" });
    }

    // cek unik
    const existingUser = await User.findOne({
      where: {
        [require("sequelize").Op.or]: [{ username }, { email }],
      },
    });
    if (existingUser) {
      return res
        .status(400)
        .send({ message: "Username atau email sudah digunakan" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // buat url lengkap profile_picture
    let profilePictureUrl = null;
    if (req.file) {
      profilePictureUrl = `${req.protocol}://${req.get("host")}/uploads/profile_pictures/${req.file.filename}`;
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
});

// ========================== BULK REGISTER (Hanya Admin) ==========================
router.post("/bulk-register", authenticateToken, authorizeRole("Admin"), async (req, res) => {
  try {
    const { users } = req.body;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return res
        .status(400)
        .send({ message: "Data users harus berupa array" });
    }

    const usernames = users.map((u) => u.username);
    const emails = users.map((u) => u.email);

    const existingUsers = await User.findAll({
      where: {
        [require("sequelize").Op.or]: [
          { username: usernames },
          { email: emails },
        ],
      },
    });

    if (existingUsers.length > 0) {
      return res.status(400).send({
        message: "Beberapa username/email sudah digunakan",
      });
    }

    const processedUsers = await Promise.all(
      users.map(async (u) => ({
        ...u,
        password: await bcrypt.hash(u.password, 10),
        profile_picture: u.profile_picture || null,
        status: 1,
      }))
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
});

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
    const user = await User.findOne({ where: whereClause });

    if (!user) return res.status(404).send({ message: "Username tidak sesuai" });

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(400).send({ message: "Password tidak sesuai" });
    }

    const token = jwt.sign(
      { id_user: user.id_user, role: user.role, nama: user.nama },
      process.env.SECRET_KEY,
      // { expiresIn: process.env.JWT_EXPIRES_IN }
      { expiresIn: "1d" }
    );

    return res.status(200).send({
      message: "Login berhasil",
      token,
      nama: user.nama,
      role: user.role,
      profile_picture: user.profile_picture
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

// ========================== GET ALL USER (Hanya Admin) ==========================
router.get("/", authenticateToken, authorizeRole("Admin"), async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: {
        exclude: ["password"],
      },
    });
    return res.status(200).send({ message: "success", users });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err });
  }
});

// ========================== GET USER PROFILE ==========================
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const id_user = parseInt(req.user.id_user, 10); // pastikan integer
    const user = await User.findByPk(id_user, {
      attributes: { 
        exclude: [
          "password",
          "otp_code",
          "otp_expires"
        ] 
      },
    });

    if (!user) return res.status(404).send({ message: "User tidak ditemukan" });

    return res.status(200).send({ message: "success", user });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== GET USER BY ID ==========================
router.get("/:id_user", authenticateToken, async (req, res) => {
  try {
    const { id_user } = req.params;
    const user = await User.findByPk(id_user, {
      attributes: {
        exclude: ["password"],
      },
    });

    if (!user) return res.status(404).send({ message: "User tidak ditemukan" });

    return res.status(200).send({ message: "success", user });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err });
  }
});

// =============== UPDATE USER ===============
router.put("/:id_user", authenticateToken, uploadProfile.single("profile_picture"), async (req, res) => {
  try {
    const { id_user } = req.params;

    // hanya admin atau user itu sendiri yang bisa update
    if (req.user.role !== "Admin" && req.user.id_user.toString() !== id_user.toString()) {
      return res.status(403).send({ message: "Tidak punya izin untuk update user ini" });
    }

    const user = await User.findByPk(id_user);
    if (!user) return res.status(404).send({ message: "User tidak ditemukan" });

    const updateData = { ...req.body };

    if (req.file) {
      const profilePictureUrl = `${req.protocol}://${req.get("host")}/uploads/profile_pictures/${req.file.filename}`;
      updateData.profile_picture = profilePictureUrl;
    }

    await user.update(updateData);

    return res.status(200).send({ message: "User berhasil diupdate" });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// =============== REQUEST OTP (FORGOT PASSWORD) ===============
router.post("/request-otp", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id_user); // ambil dari token
    if (!user) return res.status(404).send({ message: "User tidak ditemukan" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

    await user.update({ otp_code: otp, otp_expires: expires });

    // Kirim email OTP ke email yang ada di DB
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Support App" <${process.env.EMAIL_USER}>`,
      to: user.email, // ambil dari DB
      subject: "OTP Reset Password",
      text: `Halo ${user.nama},\n\nKode OTP Anda adalah: ${otp}\nBerlaku 5 menit.\n\nTerima kasih.`,
    });

    return res.status(200).send({ message: `OTP berhasil dikirim ke email ${user.email}` });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// =============== CHANGE PASSWORD WITH OTP ===============
router.post("/reset-password", authenticateToken, async (req, res) => {
  try {
    const { otp_code, new_password } = req.body;

    if (!otp_code || !new_password) {
      return res.status(400).send({ message: "OTP dan password baru wajib diisi" });
    }

    const user = await User.findByPk(req.user.id_user); // ambil dari token
    if (!user) return res.status(404).send({ message: "User tidak ditemukan" });

    if (user.otp_code !== otp_code || new Date() > new Date(user.otp_expires)) {
      return res.status(400).send({ message: "OTP tidak valid atau sudah kadaluarsa" });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await user.update({
      password: hashedPassword,
      otp_code: null,
      otp_expires: null,
    });

    return res.status(200).send({ message: "Password berhasil direset" });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== REQUEST OTP (FORGOT PASSWORD) ==========================
router.post("/forgot-password/request-otp", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).send({ message: "Username atau email wajib diisi" });
    }

    // Cari user berdasarkan username atau email
    const user = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }],
      },
    });

    if (!user) return res.status(404).send({ message: "User tidak ditemukan" });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

    await user.update({ otp_code: otp, otp_expires: expires });

    // Kirim OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Support App" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "OTP Reset Password",
      text: `Halo ${user.nama},\n\nKode OTP Anda adalah: ${otp}\nBerlaku selama 5 menit.\n\nTerima kasih.`,
    });

    return res.status(200).send({ message: `OTP berhasil dikirim ke email ${user.email}` });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ========================== CHANGE PASSWORD WITH OTP (FORGOT PASSWORD) ==========================
router.post("/forgot-password/change", async (req, res) => {
  try {
    const { username, otp_code } = req.body;
    if (!username || !otp_code) {
      return res.status(400).send({ message: "Username/email dan OTP wajib diisi" });
    }

    // Cari user berdasarkan username atau email
    const user = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email: username }],
      },
    });

    if (!user) return res.status(404).send({ message: "User tidak ditemukan" });

    // Validasi OTP
    if (user.otp_code !== otp_code || new Date() > new Date(user.otp_expires)) {
      return res.status(400).send({ message: "OTP tidak valid atau sudah kadaluarsa" });
    }

    // Generate password random baru
    const newPasswordPlain = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPasswordPlain, 10);

    await user.update({
      password: hashedPassword,
      otp_code: null,
      otp_expires: null,
    });

    // Kirim password baru via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Support App" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Baru Anda",
      text: `Halo ${user.nama},\n\nPassword baru Anda adalah: ${newPasswordPlain}\nSilakan login menggunakan password ini dan segera ganti password Anda setelah login.\n\nTerima kasih.`,
    });

    return res.status(200).send({ message: "Password baru berhasil dikirim ke email Anda" });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

module.exports = router;
