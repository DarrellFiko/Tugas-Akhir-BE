require("dotenv").config(); // load .env

const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();

// CORS configuration
const corsOptions = {
  origin: '*', // Allow all origins, or specify your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middleware global
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// const { multerErrorHandler } = require("./middleware/errorHandler");

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
const beritaAcaraRoutes = require("./routes/beritaAcara");
const modulRoutes = require("./routes/modul");
const pengumpulanModulRoutes = require("./routes/pengumpulanModul");
const nilaiRoutes = require("./routes/nilai");
const ujianRoutes = require("./routes/ujian");
const soalRoutes = require("./routes/soal");
const jawabanUjianRoutes = require("./routes/jawabanUjian");

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
const Modul = require("./model/Modul");
const PengumpulanModul = require("./model/PengumpulanModul");
const Nilai = require("./model/Nilai");
const Ujian = require("./model/Ujian");
const Soal = require("./model/Soal");
const JawabanUjian = require("./model/JawabanUjian");

// ================= RELATION =================

// --- Wali Kelas ---
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
Pelajaran.hasMany(KelasTahunAjaran, { foreignKey: "id_pelajaran", as: "kelasTahunAjaranList" });
KelasTahunAjaran.hasMany(KelasSiswa, { foreignKey: "id_kelas", sourceKey: "id_kelas", as: "SiswaKelas" });
KelasSiswa.belongsTo(KelasTahunAjaran, { foreignKey: "id_kelas", targetKey: "id_kelas", as: "KelasTahunAjaranRef" });
Pengumuman.belongsTo(KelasTahunAjaran, { foreignKey: "id_kelas_tahun_ajaran", as: "kelasTahunAjaran", onDelete: "CASCADE" });
KelasTahunAjaran.hasMany(Pengumuman, { foreignKey: "id_kelas_tahun_ajaran", as: "pengumumanList", onDelete: "CASCADE" });

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

// --- Berita Acara ---
BeritaAcara.belongsTo(KelasTahunAjaran, { foreignKey: "id_kelas_tahun_ajaran", as: "kelasTahunAjaran" });
KelasTahunAjaran.hasMany(BeritaAcara, { foreignKey: "id_kelas_tahun_ajaran", as: "beritaAcaraList" });

// --- Presensi ---
Presensi.belongsTo(BeritaAcara, { foreignKey: "id_berita_acara", as: "beritaAcara" });
Presensi.belongsTo(User, { foreignKey: "id_siswa", as: "siswa" });
BeritaAcara.hasMany(Presensi, { foreignKey: "id_berita_acara", as: "presensiList" });

// --- Modul ---
Modul.belongsTo(KelasTahunAjaran, { foreignKey: "id_kelas_tahun_ajaran", as: "kelasTahunAjaran" });
KelasTahunAjaran.hasMany(Modul, { foreignKey: "id_kelas_tahun_ajaran", as: "modulList" });

// --- Pengumpulan Modul ---
PengumpulanModul.belongsTo(User, { foreignKey: "id_siswa", as: "siswa" });

// --- Nilai ---
Nilai.belongsTo(User, { foreignKey: "id_siswa", as: "siswa" });
Nilai.belongsTo(KelasTahunAjaran, { foreignKey: "id_kelas_tahun_ajaran", as: "kelasTahunAjaran" });
Nilai.belongsTo(Modul, { foreignKey: "id_modul", as: "modul" });

User.hasMany(Nilai, { foreignKey: "id_siswa", as: "nilaiList" });
KelasTahunAjaran.hasMany(Nilai, { foreignKey: "id_kelas_tahun_ajaran", as: "nilaiList" });
Modul.hasMany(Nilai, { foreignKey: "id_modul", as: "nilaiModulList" });

// --- Ujian ---
Ujian.belongsTo(KelasTahunAjaran, { foreignKey: "id_kelas_tahun_ajaran", as: "kelasTahunAjaran" });
KelasTahunAjaran.hasMany(Ujian, { foreignKey: "id_kelas_tahun_ajaran", as: "ujianList" });

Ujian.hasMany(Soal, { foreignKey: "id_ujian", as: "soalList" });
Soal.belongsTo(Ujian, { foreignKey: "id_ujian", as: "ujian" });

JawabanUjian.belongsTo(Soal, { foreignKey: "id_soal" });
Soal.hasMany(JawabanUjian, { foreignKey: "id_soal" });

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
app.use("/api/berita-acara", beritaAcaraRoutes);
app.use("/api/modul", modulRoutes);
app.use("/api/pengumpulan-modul", pengumpulanModulRoutes);
app.use("/api/nilai", nilaiRoutes);
app.use("/api/ujian", ujianRoutes);
app.use("/api/soal", soalRoutes);
app.use("/api/jawaban-ujian", jawabanUjianRoutes);

// Static folder untuk upload file
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads/pengumuman", express.static(path.join(__dirname, "uploads/pengumuman")));

// Error handler
// app.use(multerErrorHandler);

// Port ambil dari .env, fallback ke 8080
const PORT = process.env.PORT || 8080;

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
