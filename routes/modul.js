const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const sequelize = require("../config/sequelize");
const Modul = require("../model/Modul");
const KelasTahunAjaran = require("../model/KelasTahunAjaran");
const PengumpulanModul = require("../model/PengumpulanModul");
const User = require("../model/User");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const KelasSiswa = require("../model/KelasSiswa");

// ================== CREATE ==================
router.post(
  "/",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  async (req, res) => {
    try {
      const {
        id_kelas_tahun_ajaran,
        nama_modul,
        jenis_modul,
        start_date,
        end_date,
        keterangan,
        tipe_file_modul,
        sifat_pengumpulan,
        status_modul,
      } = req.body;

      if (
        !id_kelas_tahun_ajaran ||
        !nama_modul ||
        !jenis_modul ||
        !start_date ||
        !end_date ||
        !tipe_file_modul ||
        !sifat_pengumpulan ||
        !status_modul
      ) {
        return res.status(400).send({
          message:
            "Field wajib: id_kelas_tahun_ajaran, nama_modul, jenis_modul, start_date, end_date, tipe_file_modul, sifat_pengumpulan, status_modul",
        });
      }

      const modul = await Modul.create({
        id_kelas_tahun_ajaran,
        nama_modul,
        jenis_modul,
        start_date,
        end_date,
        keterangan,
        tipe_file_modul,
        sifat_pengumpulan,
        status_modul,
        id_created_by: req.user.id_user,
      });

      return res.status(201).send({
        message: "Modul berhasil dibuat",
        data: modul,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send({
        message: "Terjadi kesalahan",
        error: error.message,
      });
    }
  }
);

// ================== GET ALL ==================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran } = req.query;
    const whereClause = {};

    if (id_kelas_tahun_ajaran) {
      whereClause.id_kelas_tahun_ajaran = id_kelas_tahun_ajaran;
    }

    const modulList = await Modul.findAll({
      where: whereClause,
      include: [
        {
          model: KelasTahunAjaran,
          as: "kelasTahunAjaran",
        },
      ],
      order: [
        ["start_date", "DESC"],
        ["id_modul", "DESC"],
      ],
    });

    // Map dengan tambahan jumlah pengumpulan
    const dataWithCount = await Promise.all(
      modulList.map(async (modul) => {
        // Hitung total siswa dalam kelas terkait modul ini
        const totalSiswa = await KelasSiswa.count({
          where: {
            id_kelas: modul.kelasTahunAjaran.id_kelas,
            id_tahun_ajaran: modul.kelasTahunAjaran.id_tahun_ajaran,
            deleted_at: null,
          },
        });

        // Hitung jumlah pengumpulan modul ini
        const jumlahPengumpul = await PengumpulanModul.count({
          where: { id_modul: modul.id_modul, deleted_at: null },
        });

        return {
          ...modul.toJSON(),
          banyakPengumpulan: `${jumlahPengumpul} / ${totalSiswa}`,
        };
      })
    );

    return res.status(200).send({
      message: "success",
      data: dataWithCount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ================== GET BY ID ==================
router.get("/:id_modul", authenticateToken, async (req, res) => {
  try {
    const { id_modul } = req.params;

    const modul = await Modul.findByPk(id_modul, {
      include: [
        {
          model: KelasTahunAjaran,
          as: "kelasTahunAjaran",
        },
      ],
    });

    if (!modul) {
      return res.status(404).send({ message: "Modul tidak ditemukan" });
    }

    // Hitung total siswa di kelas modul ini
    const totalSiswa = await KelasSiswa.count({
      where: {
        id_kelas: modul.kelasTahunAjaran.id_kelas,
        id_tahun_ajaran: modul.kelasTahunAjaran.id_tahun_ajaran,
        deleted_at: null,
      },
    });

    // Ambil semua pengumpulan modul
    const pengumpulanList = await PengumpulanModul.findAll({
      where: { id_modul, deleted_at: null },
      include: [
        {
          model: User,
          as: "siswa",
          attributes: ["id_user", "nama", "email"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    const jumlahPengumpul = pengumpulanList.length;

    const formatted = pengumpulanList.map((p) => ({
      id_pengumpulan_modul: p.id_pengumpulan_modul,
      id_siswa: p.id_siswa,
      nama_siswa: p.siswa?.nama || null,
      email: p.siswa?.email || null,
      file_pengumpulan: p.file_pengumpulan,
      created_at: p.created_at,
    }));

    return res.status(200).send({
      message: "success",
      data: {
        ...modul.toJSON(),
        banyakPengumpulan: `${jumlahPengumpul} / ${totalSiswa}`,
        pengumpulan: formatted,
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});


// ================== UPDATE ==================
router.put(
  "/:id_modul",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  async (req, res) => {
    try {
      const { id_modul } = req.params;
      const modul = await Modul.findByPk(id_modul);

      if (!modul) {
        return res.status(404).send({ message: "Modul tidak ditemukan" });
      }

      if (modul.id_created_by !== req.user.id_user) {
        return res
          .status(403)
          .send({ message: "Anda tidak memiliki akses untuk mengubah modul ini" });
      }

      const {
        nama_modul,
        jenis_modul,
        start_date,
        end_date,
        keterangan,
        tipe_file_modul,
        sifat_pengumpulan,
        status_modul,
      } = req.body;

      await modul.update({
        nama_modul: nama_modul || modul.nama_modul,
        jenis_modul: jenis_modul || modul.jenis_modul,
        start_date: start_date || modul.start_date,
        end_date: end_date || modul.end_date,
        keterangan: keterangan || modul.keterangan,
        tipe_file_modul: tipe_file_modul || modul.tipe_file_modul,
        sifat_pengumpulan: sifat_pengumpulan || modul.sifat_pengumpulan,
        status_modul: status_modul || modul.status_modul,
        updated_at: new Date(),
      });

      return res.status(200).send({
        message: "Modul berhasil diperbarui",
        data: modul,
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== DELETE ==================
router.delete(
  "/:id_modul",
  authenticateToken,
  authorizeRole(["Admin", "Guru"]),
  async (req, res) => {
    try {
      const { id_modul } = req.params;
      const modul = await Modul.findByPk(id_modul);

      if (!modul) {
        return res.status(404).send({ message: "Modul tidak ditemukan" });
      }

      if (modul.id_created_by !== req.user.id_user) {
        return res
          .status(403)
          .send({ message: "Anda tidak memiliki akses untuk menghapus modul ini" });
      }

      await modul.destroy();

      return res.status(200).send({
        message: "Modul berhasil dihapus",
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

module.exports = router;
