require("dotenv").config(); // load .env

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= IMPORT ROUTER =================
const userRouter = require("./routes/user");
const kelasTahunAjaranRouter = require("./routes/kelasTahunAjaran");
const jadwalPelajaranRouter = require("./routes/jadwalPelajaran");
const pengumumanRouter = require("./routes/pengumuman");

// ================= TEST ROUTE =================
app.get("/test", (req, res) => {
  return res.status(200).send("Hello World!");
});

// ================= API ROUTES =================
app.use("/api/users", userRouter);
app.use("/api/pengumuman", pengumumanRouter);
app.use("/api/kelas-tahun-ajaran", kelasTahunAjaranRouter);
app.use("/api/jadwal-pelajaran", jadwalPelajaranRouter);

// Static folder untuk upload file
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Port ambil dari .env, fallback ke 8080
const PORT = process.env.PORT || 8080;

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
