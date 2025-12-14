const express = require("express");
const router = express.Router();
const JadwalPelajaran = require("../model/JadwalPelajaran");
const KelasTahunAjaran = require("../model/KelasTahunAjaran");
const Kelas = require("../model/Kelas");
const TahunAjaran = require("../model/TahunAjaran");
const KelasSiswa = require("../model/KelasSiswa");
const Pelajaran = require("../model/Pelajaran");
const User = require("../model/User");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

// ================== CREATE ==================
router.post("/", authenticateToken, authorizeRole("Admin"), async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran, hari, jam_mulai, jam_selesai } = req.body;

    const newData = await JadwalPelajaran.create({
      id_kelas_tahun_ajaran,
      hari,
      jam_mulai,
      jam_selesai,
    });

    return res.status(201).send({ message: "success", data: newData });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== GET ALL ==================
router.get("/", authenticateToken, authorizeRole("Admin"), async (req, res) => {
  try {
    const jadwalList = await JadwalPelajaran.findAll({
      include: [
        {
          model: KelasTahunAjaran,
          as: "kelasTahunAjaran",
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
        }, 
      ],
    });

    const formatted = jadwalList.map((j) => {
      const plain = j.get({ plain: true });
      return {
        id_jadwal: plain.id_jadwal,
        id_kelas_tahun_ajaran: plain.id_kelas_tahun_ajaran,
        hari: plain.hari,
        jam_mulai: plain.jam_mulai,
        jam_selesai: plain.jam_selesai,
        Kelas: plain.kelasTahunAjaran?.Kelas,
        Pelajaran: plain.kelasTahunAjaran?.Pelajaran,
        GuruPengampu: plain.kelasTahunAjaran?.GuruPengampu,
        TahunAjaran: plain.kelasTahunAjaran?.TahunAjaran
          ? {
              id_tahun_ajaran: plain.kelasTahunAjaran.TahunAjaran.id_tahun_ajaran,
              nama: `${plain.kelasTahunAjaran.TahunAjaran.nama}`,
            }
          : null,
      };
    });

    return res.status(200).send({ message: "success", data: formatted });
  } catch (err) {
    console.error("Error GET ALL jadwal:", err);
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== GET JADWAL SISWA ==================
router.get(
  "/siswa/:id_tahun_ajaran",
  authenticateToken,
  authorizeRole(["Siswa"]),
  async (req, res) => {
    try {
      const { id_tahun_ajaran } = req.params;
      const id_siswa = req.user.id_user;

      const kelasSiswa = await KelasSiswa.findOne({
        where: { id_tahun_ajaran, id_siswa },
        attributes: ["id_kelas"],
      });

      if (!kelasSiswa) {
        return res.status(200).send({ message: "success", data: [] });
      }

      const kelasTA = await KelasTahunAjaran.findAll({
        where: {
          id_kelas: kelasSiswa.id_kelas,
          id_tahun_ajaran,
        },
        include: [
          { model: Kelas, as: "Kelas", attributes: ["nama_kelas"] },
          { model: Pelajaran, as: "Pelajaran", attributes: ["nama_pelajaran"] },
          { model: User, as: "GuruPengampu", attributes: ["nama"] },
        ],
      });

      const idKTAList = kelasTA.map((kta) => kta.id_kelas_tahun_ajaran);

      const jadwalList = await JadwalPelajaran.findAll({
        where: { id_kelas_tahun_ajaran: idKTAList },
        include: [
          {
            model: KelasTahunAjaran,
            as: "kelasTahunAjaran",
            include: [
              { model: Pelajaran, as: "Pelajaran", attributes: ["nama_pelajaran"] },
              { model: User, as: "GuruPengampu", attributes: ["nama"] },
              { model: Kelas, as: "Kelas", attributes: ["nama_kelas"] },
            ],
          },
        ],
        order: [
          ["hari", "ASC"],
          ["jam_mulai", "ASC"],
        ],
      });

      // Group by hari
      const grouped = {};
      jadwalList.forEach((j) => {
        const hari = j.hari || "Tidak Ditentukan";
        if (!grouped[hari]) grouped[hari] = [];

        grouped[hari].push({
          jam: `${j.jam_mulai.slice(0, 5)} - ${j.jam_selesai.slice(0, 5)}`,
          pelajaran: j.kelasTahunAjaran?.Pelajaran?.nama_pelajaran || "-",
          pengajar: j.kelasTahunAjaran?.GuruPengampu?.nama || "-",
          kelas: j.kelasTahunAjaran?.Kelas?.nama_kelas || "-",
        });
      });

      return res.status(200).send({ message: "success", data: grouped });
    } catch (err) {
      console.error("Error jadwal siswa:", err);
      return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== GET JADWAL GURU ==================
router.get(
  "/guru/:id_tahun_ajaran",
  authenticateToken,
  authorizeRole(["Guru"]),
  async (req, res) => {
    try {
      const { id_tahun_ajaran } = req.params;
      const id_guru = req.user.id_user;

      const kelasTA = await KelasTahunAjaran.findAll({
        where: { id_tahun_ajaran, guru_pengampu: id_guru },
        include: [
          { model: Kelas, as: "Kelas", attributes: ["nama_kelas"] },
          { model: Pelajaran, as: "Pelajaran", attributes: ["nama_pelajaran"] },
        ],
      });

      const idKTAList = kelasTA.map((kta) => kta.id_kelas_tahun_ajaran);

      const jadwalList = await JadwalPelajaran.findAll({
        where: { id_kelas_tahun_ajaran: idKTAList },
        include: [
          {
            model: KelasTahunAjaran,
            as: "kelasTahunAjaran",
            include: [
              { model: Pelajaran, as: "Pelajaran", attributes: ["nama_pelajaran"] },
              { model: Kelas, as: "Kelas", attributes: ["nama_kelas"] },
            ],
          },
        ],
        order: [
          ["hari", "ASC"],
          ["jam_mulai", "ASC"],
        ],
      });

      // Group by hari
      const grouped = {};
      jadwalList.forEach((j) => {
        const hari = j.hari || "Tidak Ditentukan";
        if (!grouped[hari]) grouped[hari] = [];

        grouped[hari].push({
          jam: `${j.jam_mulai.slice(0, 5)} - ${j.jam_selesai.slice(0, 5)}`,
          pelajaran: j.kelasTahunAjaran?.Pelajaran?.nama_pelajaran || "-",
          kelas: j.kelasTahunAjaran?.Kelas?.nama_kelas || "-",
        });
      });

      return res.status(200).send({ message: "success", data: grouped });
    } catch (err) {
      console.error("Error jadwal guru:", err);
      return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
    }
  }
);

// ================== GET BY ID ==================
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const data = await JadwalPelajaran.findOne({
      where: { id_jadwal: req.params.id },
      include: [
        {
          model: KelasTahunAjaran,
          as: "KelasTahunAjaran",
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
        },
      ],
      raw: true,
      nest: true,
    });

    if (!data) return res.status(404).send({ message: "Data tidak ditemukan" });

    const formatted = {
      id_jadwal: data.id_jadwal,
      id_kelas_tahun_ajaran: plain.id_kelas_tahun_ajaran,
      hari: data.hari,
      jam_mulai: data.jam_mulai,
      jam_selesai: data.jam_selesai,
      Kelas: data.KelasTahunAjaran.Kelas,
      Pelajaran: data.KelasTahunAjaran.Pelajaran,
      GuruPengampu: data.KelasTahunAjaran.GuruPengampu,
      TahunAjaran: {
        id_tahun_ajaran: data.KelasTahunAjaran.TahunAjaran.id_tahun_ajaran,
        nama: `${data.KelasTahunAjaran.TahunAjaran.nama}`,
      },
    };

    return res.status(200).send({ message: "success", data: formatted });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== UPDATE ==================
router.put("/:id", authenticateToken, authorizeRole("Admin"), async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran, hari, jam_mulai, jam_selesai } = req.body;

    const [updated] = await JadwalPelajaran.update(
      { id_kelas_tahun_ajaran, hari, jam_mulai, jam_selesai },
      { where: { id_jadwal: req.params.id } }
    );

    if (!updated) return res.status(404).send({ message: "Data tidak ditemukan" });

    return res.status(200).send({ message: "success" });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== DELETE ==================
router.delete("/:id", authenticateToken, authorizeRole("Admin"), async (req, res) => {
  try {
    const deleted = await JadwalPelajaran.destroy({ where: { id_jadwal: req.params.id } });

    if (!deleted) return res.status(404).send({ message: "Data tidak ditemukan" });

    return res.status(200).send({ message: "success" });
  } catch (err) {
    return res.status(500).send({ message: "Terjadi kesalahan", error: err.message });
  }
});

module.exports = router;
