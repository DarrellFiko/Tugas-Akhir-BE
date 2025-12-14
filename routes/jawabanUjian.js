const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const JawabanUjian = require("../model/JawabanUjian");
const Soal = require("../model/Soal");
const Ujian = require("../model/Ujian");

// ================== CREATE ==================
router.post("/", authenticateToken, authorizeRole("Siswa"), async (req, res) => {
  try {
    const { id_soal, jawaban, status, keterangan } = req.body;
    const id_user = req.user.id_user;

    // ================== CEK INPUT WAJIB ==================
    if (!id_soal) {
      return res.status(400).send({ message: "id_soal wajib ada" });
    }

    // ================== CEK SOAL ==================
    const soal = await Soal.findByPk(id_soal);
    if (!soal || soal.deleted_at) {
      return res.status(404).send({ message: "Soal tidak ditemukan" });
    }

    // ================== CEK UJIAN ==================
    const ujian = await Ujian.findByPk(soal.id_ujian);
    if (!ujian || ujian.deleted_at) {
      return res.status(404).send({ message: "Ujian tidak ditemukan" });
    }

    // ================== CEK SISWA TERDAFTAR ==================
    let listSiswa = [];
    try {
      listSiswa =
        typeof ujian.list_siswa === "string"
          ? JSON.parse(ujian.list_siswa)
          : ujian.list_siswa || [];
    } catch {
      listSiswa = [];
    }

    if (!Array.isArray(listSiswa) || !listSiswa.includes(id_user)) {
      return res.status(403).send({
        message: "Kamu tidak terdaftar dalam ujian ini, tidak dapat menjawab soal.",
      });
    }

    // ================== CEK WAKTU UJIAN ==================
    const now = new Date();
    if (now < new Date(ujian.start_date)) {
      return res.status(403).send({ message: "Ujian belum dimulai." });
    }
    if (now > new Date(ujian.end_date)) {
      return res.status(403).send({ message: "Waktu ujian sudah berakhir." });
    }

    // ================== CEK SUDAH MENJAWAB ==================
    const existingAnswer = await JawabanUjian.findOne({
      where: { id_user, id_soal },
    });
    if (existingAnswer) {
      return res.status(400).send({ message: "Kamu sudah menjawab soal ini." });
    }

    // ================== FORMAT JAWABAN ==================
    let formattedJawaban;
    if (Array.isArray(jawaban) || typeof jawaban === "object") {
      formattedJawaban = JSON.stringify(jawaban);
    } else if (typeof jawaban === "string" || typeof jawaban === "number") {
      formattedJawaban = String(jawaban);
    } else {
      formattedJawaban = null;
    }

    // ================== HITUNG NILAI (TIDAK DIRETURNKAN) ==================
    let nilai = 0;
    const jenis = soal.jenis_soal;
    const jawabanBenar = soal.jawaban_benar;

    try {
      if (jenis === "isian") {
        nilai = 0;
      } else if (jenis === "pilihan_ganda_satu") {
        if (String(jawabanBenar).trim() === String(jawaban).trim()) {
          nilai = soal.score || 0;
        }
      } else if (jenis === "pilihan_ganda_banyak") {
        let parsedJawaban = [];
        let parsedBenar = [];

        try {
          parsedJawaban =
            typeof jawaban === "string" ? JSON.parse(jawaban) : jawaban;
        } catch {
          parsedJawaban = [];
        }

        try {
          parsedBenar =
            typeof jawabanBenar === "string"
              ? JSON.parse(jawabanBenar)
              : jawabanBenar;
        } catch {
          parsedBenar = [];
        }

        const isEqual =
          Array.isArray(parsedJawaban) &&
          Array.isArray(parsedBenar) &&
          parsedJawaban.length === parsedBenar.length &&
          parsedJawaban.every((v) => parsedBenar.includes(v));

        nilai = isEqual ? soal.score || 0 : 0;
      }
    } catch {
      nilai = 0;
    }

    // ================== SIMPAN JAWABAN ==================
    const newJawaban = await JawabanUjian.create({
      id_user,
      id_soal,
      jawaban: formattedJawaban,
      status: status || "selesai",
      keterangan: keterangan || null,
      nilai, // disimpan di DB, tapi tidak dikirim balik
    });

    // Hapus kolom nilai dari response
    const { nilai: _, ...jawabanResponse } = newJawaban.toJSON();

    return res.status(201).send({
      message: "Jawaban berhasil disimpan",
      data: jawabanResponse,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ================== GET ALL ==================
router.get(
  "/",
  authenticateToken,
  authorizeRole("Guru"),
  async (req, res) => {
    try {
      const { id_soal } = req.query;

      if (!id_soal) {
        return res.status(400).send({
          message: "Parameter id_soal wajib disertakan",
        });
      }

      // Ambil semua jawaban siswa berdasarkan id_soal
      const jawabanList = await JawabanUjian.findAll({
        where: { id_soal },
        order: [["created_at", "DESC"]],
      });

      return res.status(200).send({
        message: "success",
        data: jawabanList,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).send({
        message: "Terjadi kesalahan",
        error: err.message,
      });
    }
  }
);

// ================== UPDATE NILAI ==================
router.put("/:id", authenticateToken, authorizeRole("Guru"), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id)
    const { nilai, keterangan } = req.body;

    // Validasi input
    if (nilai === undefined || nilai === null) {
      return res.status(400).send({ message: "Nilai wajib diisi" });
    }

    // Cari jawaban
    const jawaban = await JawabanUjian.findByPk(id);
    if (!jawaban) {
      return res.status(404).send({ message: "Jawaban tidak ditemukan" });
    }

    // Update nilai & keterangan
    jawaban.nilai = nilai;
    if (keterangan !== undefined) {
      jawaban.keterangan = keterangan;
    }
    await jawaban.save();

    return res.status(200).send({
      message: "Nilai berhasil diperbarui",
      data: jawaban,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

module.exports = router;
