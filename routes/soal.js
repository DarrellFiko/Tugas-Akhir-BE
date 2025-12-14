const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const Soal = require("../model/Soal");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const { uploadSoal } = require("../middleware/multer");
const Ujian = require("../model/Ujian");
const JawabanUjian = require("../model/JawabanUjian");

// Helper untuk URL gambar
const getFileUrl = (req, filename) => {
  if (!filename) return null;
  return `${req.protocol}://${req.get("host")}/uploads/soal/${filename}`;
};

// ================== CREATE ==================
router.post(
  "/",
  authenticateToken,
  authorizeRole("Guru"),
  uploadSoal.single("gambar"),
  async (req, res) => {
    try {
      const {
        id_ujian,
        jenis_soal,
        text_soal,
        list_jawaban,
        jawaban_benar,
        score,
      } = req.body;

      if (!id_ujian || !jenis_soal || !text_soal) {
        return res.status(400).send({
          message: "Field wajib: id_ujian, jenis_soal, text_soal",
        });
      }

      // Validasi score
      let finalScore = 0;
      if (score !== undefined) {
        const parsedScore = parseInt(score);
        if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
          return res.status(400).send({
            message: "Score harus berupa angka antara 0 - 100",
          });
        }
        finalScore = parsedScore;
      }

      const soal = await Soal.create({
        id_ujian,
        jenis_soal,
        text_soal,
        list_jawaban: list_jawaban ? JSON.parse(list_jawaban) : null,
        jawaban_benar: jawaban_benar || null,
        gambar: req.file ? req.file.filename : null,
        score: finalScore,
      });

      return res.status(201).send({
        message: "Soal berhasil dibuat",
        data: {
          ...soal.toJSON(),
          gambar_url: getFileUrl(req, soal.gambar),
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== GET ALL (Guru & Admin - tampilkan jawaban benar) ==================
router.get(
  "/guru",
  authenticateToken,
  authorizeRole(["Guru", "Admin"]),
  async (req, res) => {
    try {
      const { id_ujian } = req.query;
      const whereClause = { deleted_at: null };
      if (id_ujian) whereClause.id_ujian = id_ujian;

      const soalList = await Soal.findAll({
        where: whereClause,
        order: [["created_at", "DESC"]],
      });

      const result = soalList.map((s) => ({
        ...s.toJSON(),
        gambar_url: getFileUrl(req, s.gambar),
      }));

      return res.status(200).send({
        message: "success",
        data: result,
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

// ================== GET ALL (Siswa - sembunyikan jawaban benar) ==================
router.get(
  "/siswa",
  authenticateToken,
  authorizeRole(["Siswa"]),
  async (req, res) => {
    try {
      const { id_ujian } = req.query;
      const whereClause = { deleted_at: null };
      if (id_ujian) whereClause.id_ujian = id_ujian;

      const soalList = await Soal.findAll({
        where: whereClause,
        order: [["created_at", "DESC"]],
      });

      const result = soalList.map((s) => {
        const soal = s.toJSON();
        delete soal.jawaban_benar;
        return {
          ...soal,
          gambar_url: getFileUrl(req, soal.gambar),
        };
      });

      return res.status(200).send({
        message: "success",
        data: result,
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

/* ================== NEW: GET RANDOM SOAL BY UJIAN (untuk siswa) ================== */
router.get(
  "/random/:id_ujian",
  authenticateToken,
  authorizeRole(["Siswa"]),
  async (req, res) => {
    try {
      const { id_ujian } = req.params;
      const id_user = req.user.id_user;

      // CEK UJIAN
      const ujian = await Ujian.findByPk(id_ujian);
      if (!ujian || ujian.deleted_at) {
        return res.status(404).send({ message: "Ujian tidak ditemukan" });
      }

      // CEK SISWA TERDAFTAR
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
        return res
          .status(403)
          .send({ message: "Kamu tidak terdaftar di ujian ini" });
      }

      // CEK WAKTU UJIAN VALID
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

      // CEK SOAL YANG SUDAH DIKERJAKAN
      const { Op } = require("sequelize");
      const jawabanUser = await JawabanUjian.findAll({
        where: { id_user },
        attributes: ["id_soal"],
      });

      const soalDikerjakan = jawabanUser.map((j) => j.id_soal);

      // AMBIL SOAL BELUM DIKERJAKAN
      const soalBelum = await Soal.findAll({
        where: {
          id_ujian,
          deleted_at: null,
          id_soal: { [Op.notIn]: soalDikerjakan.length ? soalDikerjakan : [0] },
        },
      });

      if (!soalBelum.length) {
        return res
          .status(200)
          .send({ message: "Semua soal sudah dijawab", data: null });
      }

      // PRIORITAS RANDOM: PILIHAN GANDA DULU
      const pgSoal = soalBelum.filter(
        (s) =>
          s.jenis_soal === "pilihan_ganda_satu" ||
          s.jenis_soal === "pilihan_ganda_banyak"
      );
      const isianSoal = soalBelum.filter(
        (s) => s.jenis_soal === "isian" || s.jenis_soal === "uraian"
      );

      let selectedSoal;
      if (pgSoal.length > 0) {
        selectedSoal = pgSoal[Math.floor(Math.random() * pgSoal.length)];
      } else {
        selectedSoal = isianSoal[Math.floor(Math.random() * isianSoal.length)];
      }

      if (!selectedSoal) {
        return res
          .status(404)
          .send({ message: "Tidak ada soal yang tersedia untuk ujian ini" });
      }

      // FORMAT HASIL
      const soalObj = selectedSoal.toJSON();
      delete soalObj.jawaban_benar;

      return res.status(200).send({
        message: "success",
        data: {
          ...soalObj,
          gambar_url: getFileUrl(req, soalObj.gambar),
        },
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== GET BY ID ==================
router.get("/:id_soal", authenticateToken, async (req, res) => {
  try {
    const { id_soal } = req.params;
    const soal = await Soal.findByPk(id_soal);

    if (!soal || soal.deleted_at) {
      return res.status(404).send({ message: "Soal tidak ditemukan" });
    }

    return res.status(200).send({
      message: "success",
      data: {
        ...soal.toJSON(),
        gambar_url: getFileUrl(req, soal.gambar),
      },
    });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== UPDATE ==================
router.put(
  "/:id_soal",
  authenticateToken,
  authorizeRole("Guru"),
  uploadSoal.single("gambar"),
  async (req, res) => {
    try {
      const { id_soal } = req.params;
      const soal = await Soal.findByPk(id_soal);

      if (!soal || soal.deleted_at) {
        return res.status(404).send({ message: "Soal tidak ditemukan" });
      }

      const updateData = {
        jenis_soal: req.body.jenis_soal || soal.jenis_soal,
        text_soal: req.body.text_soal || soal.text_soal,
        list_jawaban: req.body.list_jawaban
          ? JSON.parse(req.body.list_jawaban)
          : soal.list_jawaban,
        jawaban_benar: req.body.jawaban_benar || soal.jawaban_benar,
        updated_at: new Date(),
      };

      // === Validasi dan detect perubahan score ===
      let scoreChanged = false;
      let jawabanChanged = false;
      let newScore = soal.score;
      let newJawabanBenar = soal.jawaban_benar;

      // Cek apakah score berubah
      if (req.body.score !== undefined) {
        const parsedScore = parseInt(req.body.score);
        if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
          return res.status(400).send({
            message: "Score harus berupa angka antara 0 - 100",
          });
        }
        if (parsedScore !== soal.score) {
          scoreChanged = true;
          newScore = parsedScore;
          updateData.score = parsedScore;
        }
      }

      // Cek apakah jawaban benar berubah
      if (
        req.body.jawaban_benar &&
        req.body.jawaban_benar !== soal.jawaban_benar
      ) {
        jawabanChanged = true;
        newJawabanBenar = req.body.jawaban_benar;
      }

      // === Upload file gambar baru ===
      if (req.file) {
        if (soal.gambar) {
          const oldPath = path.join(__dirname, "../uploads/soal", soal.gambar);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        updateData.gambar = req.file.filename;
      }

      // === Update soal di DB ===
      await soal.update(updateData);

      // === Jika score ATAU jawaban benar berubah ===
      if (
        (scoreChanged || jawabanChanged) &&
        (soal.jenis_soal === "pilihan_ganda_satu" ||
          soal.jenis_soal === "pilihan_ganda_banyak")
      ) {
        const jawabanList = await JawabanUjian.findAll({
          where: { id_soal },
        });

        for (const j of jawabanList) {
          let newNilai = 0;

          // Untuk PG satu jawaban => string comparison
          if (soal.jenis_soal === "pilihan_ganda_satu") {
            if (j.jawaban === newJawabanBenar) newNilai = newScore;
          }

          // Untuk PG banyak => bandingkan array
          else if (soal.jenis_soal === "pilihan_ganda_banyak") {
            try {
              const jawabanUser = JSON.parse(j.jawaban || "[]");
              const jawabanBenarArr = JSON.parse(newJawabanBenar || "[]");

              const isEqual =
                Array.isArray(jawabanUser) &&
                jawabanUser.length === jawabanBenarArr.length &&
                jawabanUser.every((val) => jawabanBenarArr.includes(val));

              if (isEqual) newNilai = newScore;
            } catch {
              // jika parsing gagal, tetap nilai = 0
              newNilai = 0;
            }
          }

          // Update jika berubah
          if (newNilai !== j.nilai) {
            await j.update({ nilai: newNilai });
          }
        }
      }

      return res.status(200).send({
        message: "Soal berhasil diperbarui",
        data: {
          ...soal.toJSON(),
          gambar_url: getFileUrl(req, soal.gambar),
        },
      });
    } catch (err) {
      console.error("Update soal error:", err);
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== DELETE (Hard Delete) ==================
router.delete(
  "/:id_soal",
  authenticateToken,
  authorizeRole("Guru"),
  async (req, res) => {
    try {
      const { id_soal } = req.params;

      // Cari soal
      const soal = await Soal.findByPk(id_soal);

      if (!soal) {
        return res.status(404).send({ message: "Soal tidak ditemukan" });
      }

      // Hapus semua jawaban ujian yang terkait
      await JawabanUjian.destroy({
        where: { id_soal },
      });

      // Jika ada file gambar, hapus juga dari server
      if (soal.gambar) {
        const path = require("path");
        const fs = require("fs");
        const filePath = path.join(__dirname, "../uploads/soal", soal.gambar);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      // Hapus soal dari database (hard delete)
      await soal.destroy();

      return res.status(200).send({
        message: "Soal dan semua jawaban ujian terkait berhasil dihapus permanen",
      });
    } catch (err) {
      console.error("Hard delete soal error:", err);
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== DOWNLOAD GAMBAR ==================
router.get("/download/:id_soal", authenticateToken, async (req, res) => {
  try {
    const soal = await Soal.findByPk(req.params.id_soal);

    if (!soal || soal.deleted_at) {
      return res.status(404).send({ message: "Soal tidak ditemukan" });
    }
    if (!soal.gambar) {
      return res.status(404).send({ message: "Gambar tidak tersedia" });
    }

    const filePath = path.join(__dirname, "../uploads/soal", soal.gambar);
    return res.download(filePath, soal.gambar);
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

module.exports = router;
