const express = require("express");
const router = express.Router();
const KelasTahunAjaran = require("../model/KelasTahunAjaran");
const Kelas = require("../model/Kelas");
const TahunAjaran = require("../model/TahunAjaran");
const Pelajaran = require("../model/Pelajaran");
const User = require("../model/User");
const KelasSiswa = require("../model/KelasSiswa");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const JadwalPelajaran = require("../model/JadwalPelajaran");

// ================== CREATE ==================
router.post("/", authenticateToken, authorizeRole("Admin"), async (req, res) => {
  try {
    const { id_tahun_ajaran, id_kelas, id_pelajaran, guru_pengampu } = req.body;

    const newData = await KelasTahunAjaran.create({
      id_tahun_ajaran,
      id_kelas,
      id_pelajaran,
      guru_pengampu,
    });

    return res.status(201).send({ message: "success", data: newData });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== GET ALL ==================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const data = await KelasTahunAjaran.findAll({
      where: { deleted_at: null },
      include: [
        { model: Kelas, as: "Kelas", attributes: ["id_kelas", "nama_kelas"] },
        {
          model: TahunAjaran,
          as: "TahunAjaran",
          attributes: ["id_tahun_ajaran", "nama"],
        },
        {
          model: Pelajaran,
          as: "Pelajaran",
          attributes: ["id_pelajaran", "nama_pelajaran"],
        },
        { model: User, as: "GuruPengampu", attributes: ["id_user", "nama"] },
      ],
      raw: true,
      nest: true,
    });

    const formatted = data.map((item) => ({
      ...item,
      TahunAjaran: {
        id_tahun_ajaran: item.TahunAjaran.id_tahun_ajaran,
        nama: `${item.TahunAjaran.nama}`,
      },
    }));

    return res.status(200).send({ message: "success", data: formatted });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== GET PELAJARAN BY TAHUN AJARAN ==================
router.get("/pelajaran/:id_tahun_ajaran", authenticateToken, async (req, res) => {
  try {
    const { id_tahun_ajaran } = req.params;
    const { id_user, role } = req.user;

    // ================== GURU ==================
    if (role.toLowerCase() === "guru") {
      const data = await KelasTahunAjaran.findAll({
        where: {
          id_tahun_ajaran,
          guru_pengampu: id_user,
          deleted_at: null,
        },
        include: [
          { model: Pelajaran, as: "Pelajaran", attributes: ["id_pelajaran", "nama_pelajaran"] },
          { model: Kelas, as: "Kelas", attributes: ["id_kelas", "nama_kelas"] },
          { model: User, as: "GuruPengampu", attributes: ["id_user", "nama"] },
        ],
        raw: true,
        nest: true,
      });

      if (!data.length) {
        return res.status(200).send({ message: "success", data: [] });
      }

      const formatted = data.map((item) => ({
        id_kelas_tahun_ajaran: item.id_kelas_tahun_ajaran,
        id_pelajaran: item.Pelajaran.id_pelajaran,
        nama_pelajaran: item.Pelajaran.nama_pelajaran,
        id_kelas: item.Kelas.id_kelas,
        nama_kelas: item.Kelas.nama_kelas,
        id_guru: item.GuruPengampu.id_user,
        nama_pengajar: item.GuruPengampu.nama,
      }));

      return res.status(200).send({ message: "success", data: formatted });
    }

    // ================== SISWA ==================
    if (role.toLowerCase() === "siswa") {
      const kelasSiswa = await KelasSiswa.findOne({
        where: { id_siswa: id_user, id_tahun_ajaran, deleted_at: null },
        attributes: ["id_kelas"],
      });

      if (!kelasSiswa) {
        return res.status(200).send({ message: "success", data: [] });
      }

      const data = await KelasTahunAjaran.findAll({
        where: {
          id_tahun_ajaran,
          id_kelas: kelasSiswa.id_kelas,
          deleted_at: null,
        },
        include: [
          { model: Pelajaran, as: "Pelajaran", attributes: ["id_pelajaran", "nama_pelajaran"] },
          { model: Kelas, as: "Kelas", attributes: ["id_kelas", "nama_kelas"] },
          { model: User, as: "GuruPengampu", attributes: ["id_user", "nama"] },
        ],
        raw: true,
        nest: true,
      });

      if (!data.length) {
        return res.status(200).send({ message: "success", data: [] });
      }

      const formatted = data.map((item) => ({
        id_kelas_tahun_ajaran: item.id_kelas_tahun_ajaran,
        id_pelajaran: item.Pelajaran.id_pelajaran,
        nama_pelajaran: item.Pelajaran.nama_pelajaran,
        id_kelas: item.Kelas.id_kelas,
        nama_kelas: item.Kelas.nama_kelas,
        id_guru: item.GuruPengampu.id_user,
        nama_pengajar: item.GuruPengampu.nama,
      }));

      return res.status(200).send({ message: "success", data: formatted });
    }

    // ================== ROLE TIDAK DIKENALI ==================
    return res.status(403).send({ message: "Role tidak dikenali" });
  } catch (err) {
    console.error("Error get pelajaran:", err);
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== GET BY ID ==================
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { id_user, role } = req.user;

    const data = await KelasTahunAjaran.findOne({
      where: { id_kelas_tahun_ajaran: id, deleted_at: null },
      include: [
        { model: Kelas, as: "Kelas", attributes: ["id_kelas", "nama_kelas"] },
        {
          model: TahunAjaran,
          as: "TahunAjaran",
          attributes: ["id_tahun_ajaran", "nama"],
        },
        {
          model: Pelajaran,
          as: "Pelajaran",
          attributes: ["id_pelajaran", "nama_pelajaran"],
        },
        { model: User, as: "GuruPengampu", attributes: ["id_user", "nama"] },
      ],
      raw: true,
      nest: true,
    });

    if (!data) {
      return res.status(404).send({ message: "Data tidak ditemukan" });
    }

    // ================== CEK AKSES ==================
    if (role.toLowerCase() === "guru") {
      if (data.GuruPengampu.id_user !== id_user) {
        return res.status(403).send({ message: "Anda tidak memiliki akses ke kelas ini" });
      }
    } else if (role.toLowerCase() === "siswa") {
      const kelasSiswa = await KelasSiswa.findOne({
        where: {
          id_siswa: id_user,
          id_kelas: data.Kelas.id_kelas,
          id_tahun_ajaran: data.TahunAjaran.id_tahun_ajaran,
          deleted_at: null,
        },
      });

      if (!kelasSiswa) {
        return res.status(403).send({ message: "Anda tidak memiliki akses ke kelas ini" });
      }
    } else if (role.toLowerCase() !== "admin") {
      return res.status(403).send({ message: "Role tidak dikenali" });
    }

    // ================== RESPONSE ==================
    const formatted = {
      ...data,
      TahunAjaran: {
        id_tahun_ajaran: data.TahunAjaran.id_tahun_ajaran,
        nama: `${data.TahunAjaran.nama}`,
      },
    };

    return res.status(200).send({ message: "success", data: formatted });
  } catch (err) {
    console.error("Error get kelas_tahun_ajaran by id:", err);
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ================== UPDATE ==================
router.put("/:id", authenticateToken, authorizeRole("Admin"), async (req, res) => {
  try {
    const { id_tahun_ajaran, id_kelas, id_pelajaran, guru_pengampu } = req.body;
    const { id } = req.params;

    // Validasi ID
    const idNum = Number(id);
    if (!idNum) return res.status(400).send({ message: "Parameter id tidak valid" });

    const existing = await KelasTahunAjaran.findOne({
      where: { id_kelas_tahun_ajaran: idNum, deleted_at: null },
    });

    if (!existing) {
      return res.status(404).send({ message: "Data tidak ditemukan atau sudah dihapus" });
    }

    // Update data
    await existing.update({
      id_tahun_ajaran,
      id_kelas,
      id_pelajaran,
      guru_pengampu,
      updated_at: new Date(),
    });

    return res.status(200).send({ message: "success" });
  } catch (err) {
    console.error("Error update kelas_tahun_ajaran:", err);
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== DELETE (Soft Delete) ==================
router.delete("/:id", authenticateToken, authorizeRole("Admin"), async (req, res) => {
  try {
    const { id } = req.params;

    // Cek apakah data KelasTahunAjaran ada
    const data = await KelasTahunAjaran.findOne({
      where: { id_kelas_tahun_ajaran: id, deleted_at: null },
    });

    if (!data) {
      return res.status(404).send({ message: "Data tidak ditemukan" });
    }

    // Hapus (hard delete) semua jadwal pelajaran yang terkait dengan kelas_tahun_ajaran ini
    await JadwalPelajaran.destroy({
      where: { id_kelas_tahun_ajaran: id },
    });

    // Soft delete kelas_tahun_ajaran
    await data.update({ deleted_at: new Date() });
    
    return res.status(200).send({
      message:
        "Kelas tahun ajaran dan semua jadwal pelajaran terkait berhasil dihapus",
    });
  } catch (err) {
    return res.status(500).send({
      message: "Terjadi kesalahan saat menghapus data",
      error: err.message,
    });
  }
});

module.exports = router;
