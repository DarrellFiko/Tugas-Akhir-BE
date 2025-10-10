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
const materiRouter = require("./routes/materi");
const tahunAjaranRouter = require("./routes/tahunAjaran");
const kelasRouter = require("./routes/kelas");
const pelajaranRouter = require("./routes/pelajaran");
const kelasTahunAjaranRouter = require("./routes/kelasTahunAjaran");
const jadwalPelajaranRouter = require("./routes/jadwalPelajaran");
const pengumumanRouter = require("./routes/pengumuman");
const komentarRoutes = require("./routes/komentar");
const kelasSiswaRoutes = require("./routes/kelasSiswa");

// ================= IMPORT MODEL =================
const User = require("./model/User");
const Materi = require("./model/Materi");
const Kelas = require("./model/Kelas");
const Komentar = require("./model/Komentar");
const Pengumuman = require("./model/Pengumuman");
const KelasTahunAjaran = require("./model/KelasTahunAjaran");
const TahunAjaran = require("./model/TahunAjaran");
const Pelajaran = require("./model/Pelajaran");
const JadwalPelajaran = require("./model/JadwalPelajaran");
const KelasSiswa = require("./model/KelasSiswa");
const Presensi = require("./model/Presensi");
const BeritaAcara = require("./model/BeritaAcara");

// ================= RELATION =================
Kelas.belongsTo(User, { foreignKey: "wali_kelas", as: "wali" });
User.hasMany(Kelas, { foreignKey: "wali_kelas", as: "kelas_wali" });

// --- Komentar & Pengumuman ---
Komentar.belongsTo(Pengumuman, { foreignKey: "id_pengumuman", as: "pengumuman", onDelete: "CASCADE" });
Pengumuman.hasMany(Komentar, { foreignKey: "id_pengumuman", as: "komentar" });

Komentar.belongsTo(User, { foreignKey: "id_created_by", as: "user" });
User.hasMany(Komentar, { foreignKey: "id_created_by", as: "komentar" });

// --- Kelas Tahun Ajaran ---
KelasTahunAjaran.belongsTo(TahunAjaran, { foreignKey: "id_tahun_ajaran" });
KelasTahunAjaran.belongsTo(Kelas, { foreignKey: "id_kelas" });
KelasTahunAjaran.belongsTo(Pelajaran, { foreignKey: "id_pelajaran" });
KelasTahunAjaran.belongsTo(User, { as: "GuruPengampu", foreignKey: "guru_pengampu" });

// --- Jadwal Pelajaran ---
JadwalPelajaran.belongsTo(KelasTahunAjaran, { foreignKey: "id_kelas_tahun_ajaran", as: "kelasTahunAjaran" });
KelasTahunAjaran.hasMany(JadwalPelajaran, { foreignKey: "id_kelas_tahun_ajaran", as: "jadwal" });

// --- Kelas Siswa ---
KelasSiswa.belongsTo(Kelas, { foreignKey: "id_kelas", as: "Kelas" });
KelasSiswa.belongsTo(TahunAjaran, { foreignKey: "id_tahun_ajaran", as: "TahunAjaran" });
KelasSiswa.belongsTo(User, { foreignKey: "id_siswa", as: "Siswa" });

Kelas.hasMany(KelasSiswa, { foreignKey: "id_kelas", as: "KelasSiswa" });
TahunAjaran.hasMany(KelasSiswa, { foreignKey: "id_tahun_ajaran", as: "KelasSiswa" });
User.hasMany(KelasSiswa, { foreignKey: "id_siswa", as: "SiswaKelas" });

// --- Materi ---
Materi.belongsTo(KelasTahunAjaran, { foreignKey: "id_kelas_tahun_ajaran", as: "KelasTahunAjaran" });
KelasTahunAjaran.hasMany(Materi, { foreignKey: "id_kelas_tahun_ajaran", as: "Materi" });

// --- Presensi ---
Presensi.belongsTo(BeritaAcara, { foreignKey: "id_berita_acara", as: "beritaAcara" });
Presensi.belongsTo(User, { foreignKey: "id_siswa", as: "siswa" });


// ================= TEST ROUTE =================
app.get("/test", (req, res) => {
  return res.status(200).send("Hello World!");
});

// ================= API ROUTES =================
app.use("/api/users", userRouter);
app.use("/api/materi", materiRouter);
app.use("/api/pengumuman", pengumumanRouter);
app.use("/api/komentar", komentarRoutes);
app.use("/api/tahun-ajaran", tahunAjaranRouter);
app.use("/api/kelas", kelasRouter);
app.use("/api/pelajaran", pelajaranRouter);
app.use("/api/kelas-tahun-ajaran", kelasTahunAjaranRouter);
app.use("/api/jadwal-pelajaran", jadwalPelajaranRouter);
app.use("/api/kelas-siswa", kelasSiswaRoutes);

// Static folder untuk upload file
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads/pengumuman", express.static(path.join(__dirname, "uploads/pengumuman")));

// Port ambil dari .env, fallback ke 8080
const PORT = process.env.PORT || 8080;

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
