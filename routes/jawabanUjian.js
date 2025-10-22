const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const JawabanUjian = require("../model/JawabanUjian");
const Soal = require("../model/Soal");
const Ujian = require("../model/Ujian");

// ================== CREATE ==================
router.post(
  "/",
  authenticateToken,
  authorizeRole(["Siswa"]),
  async (req, res) => {
    try {
      const { id_soal, jawaban, status, keterangan } = req.body;
      const id_user = req.user.id_user; // diambil dari token login

      // Validasi input
      if (!id_soal) {
        return res.status(400).send({
          message: "id_soal wajib ada",
        });
      }

      // Pastikan soal ada
      const soal = await Soal.findByPk(id_soal);
      if (!soal || soal.deleted_at) {
        return res.status(404).send({ message: "Soal tidak ditemukan" });
      }

      // Ambil data ujian
      const ujian = await Ujian.findByPk(soal.id_ujian);
      if (!ujian || ujian.deleted_at) {
        return res.status(404).send({ message: "Ujian tidak ditemukan" });
      }

      // ================== CEK SISWA TERDAFTAR ==================
      let listSiswa = [];
      if (ujian.list_siswa) {
        if (typeof ujian.list_siswa === "string") {
          try {
            listSiswa = JSON.parse(ujian.list_siswa);
          } catch {
            listSiswa = [];
          }
        } else {
          listSiswa = ujian.list_siswa;
        }
      }

      if (!Array.isArray(listSiswa) || !listSiswa.includes(id_user)) {
        return res.status(403).send({
          message: "Kamu tidak terdaftar dalam ujian ini, tidak dapat menjawab soal.",
        });
      }

      // ================== CEK WAKTU UJIAN ==================
      const now = new Date();
      const start = new Date(ujian.start_date);
      const end = new Date(ujian.end_date);

      if (now < start) {
        return res.status(403).send({
          message: "Ujian belum dimulai. Tunggu hingga waktu mulai.",
        });
      }

      if (now > end) {
        return res.status(403).send({
          message: "Waktu ujian sudah berakhir.",
        });
      }

      // ================== CEK SUDAH MENJAWAB ==================
      const existingAnswer = await JawabanUjian.findOne({
        where: { id_user, id_soal },
      });

      if (existingAnswer) {
        return res.status(400).send({
          message: "Kamu sudah menjawab soal ini.",
        });
      }

      // ================== SIMPAN JAWABAN ==================
      const newJawaban = await JawabanUjian.create({
        id_user,
        id_soal,
        jawaban: jawaban || null,       // <-- simpan jawaban
        status,
        keterangan: keterangan || null,
      });

      return res.status(201).send({
        message: "Jawaban berhasil disimpan",
        data: newJawaban,
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

// ================== GET ALL (hanya Guru/Admin) ==================
router.get(
  "/",
  authenticateToken,
  authorizeRole(["Guru", "Admin"]),
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

module.exports = router;
