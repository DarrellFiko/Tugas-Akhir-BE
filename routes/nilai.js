const express = require("express");
const router = express.Router();
const Nilai = require("../model/Nilai");
const User = require("../model/User");
const KelasTahunAjaran = require("../model/KelasTahunAjaran");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const Modul = require("../model/Modul");
const KelasSiswa = require("../model/KelasSiswa");
const Pelajaran = require("../model/Pelajaran");
const Ujian = require("../model/Ujian");
const Soal = require("../model/Soal");
const JawabanUjian = require("../model/JawabanUjian");

// ================== CREATE (Single or Multiple) ==================
router.post("/", authenticateToken, authorizeRole("Guru"), async (req, res) => {
  try {
    let data = req.body.data || req.body;

    if (!data) {
      return res.status(400).send({ message: "Data tidak boleh kosong" });
    }

    // Pastikan data selalu array
    if (!Array.isArray(data)) {
      data = [data];
    }

    // Validasi nilai antara 0–100
    for (const n of data) {
      if (n.nilai < 0 || n.nilai > 100) {
        return res.status(400).send({
          message: `Nilai untuk siswa ${n.nama || n.id_siswa} harus antara 0 dan 100`,
        });
      }
    }

    const created = await Nilai.bulkCreate(data, { returning: true });
    return res.status(201).send({
      message: "Berhasil menambahkan data nilai",
      data: created,
    });
  } catch (err) {
    console.error("Create nilai error:", err);
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== UPDATE (Single or Multiple) ==================
router.put("/", authenticateToken, authorizeRole("Guru"), async (req, res) => {
  try {
    let data = Array.isArray(req.body) ? req.body : [req.body];

    if (data.length === 0) {
      return res.status(400).send({ message: "Data tidak boleh kosong" });
    }

    for (const n of data) {
      if (typeof n.nilai !== "number" || n.nilai < 0 || n.nilai > 100) {
        return res.status(400).send({
          message: `Nilai untuk siswa ${n.nama || n.id_siswa} harus antara 0 dan 100`,
        });
      }

      if (!n.id_nilai) {
        console.warn(`Lewati siswa ${n.nama || n.id_siswa}, tidak ada id_nilai`);
        continue;
      }

      await Nilai.update(
        {
          id_kelas_tahun_ajaran: n.id_kelas_tahun_ajaran,
          id_siswa: n.id_siswa,
          id_modul: n.id_modul || null,
          id_ujian: n.id_ujian || null,
          nama: n.nama,
          nilai: n.nilai,
        },
        { where: { id_nilai: n.id_nilai } }
      );
    }

    return res.status(200).send({ message: "Berhasil memperbarui data nilai" });
  } catch (err) {
    console.error("Update nilai error:", err);
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ================== GET ALL ==================
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran, id_modul, id_ujian } = req.query;
    const whereClause = { deleted_at: null };

    if (id_kelas_tahun_ajaran)
      whereClause.id_kelas_tahun_ajaran = id_kelas_tahun_ajaran;

    if (id_modul) whereClause.id_modul = id_modul;
    if (id_ujian) whereClause.id_ujian = id_ujian;

    const list = await Nilai.findAll({
      where: whereClause,
      include: [
        { model: User, as: "siswa", attributes: ["id_user", "nama", "email"] },
        { model: KelasTahunAjaran, as: "kelasTahunAjaran" },
      ],
      order: [["id_nilai", "DESC"]],
    });

    return res.status(200).send({
      message: "success",
      data: list,
    });
  } catch (err) {
    console.error("Get all nilai error:", err);
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== GET NILAI BY KELAS (UNTUK GURU) ==================
router.get("/guru/:id_kelas_tahun_ajaran", authenticateToken, async (req, res) => {
  try {
    const { id_kelas_tahun_ajaran } = req.params;

    // Ambil semua siswa di kelas tersebut
    const kelasData = await KelasTahunAjaran.findByPk(id_kelas_tahun_ajaran, {
      include: [
        {
          model: KelasSiswa,
          as: "SiswaKelas",
          include: [
            {
              model: User,
              as: "Siswa",
              attributes: ["id_user", "nama"],
            },
          ],
        },
      ],
    });

    if (!kelasData) {
      return res.status(404).send({ message: "Kelas tidak ditemukan" });
    }

    // Ambil siswa unik
    const siswaList = [
      ...new Map(
        (kelasData.SiswaKelas || [])
          .map((ks) => ks.Siswa)
          .filter(Boolean)
          .map((s) => [s.id_user, s])
      ).values(),
    ];

    // Ambil semua modul (materi)
    const modulList = await Modul.findAll({
      where: { id_kelas_tahun_ajaran, deleted_at: null },
      attributes: ["id_modul", "jenis_modul", "nama_modul"],
      order: [["id_modul", "ASC"]],
    });

    // Ambil semua ujian
    const ujianList = await Ujian.findAll({
      where: { id_kelas_tahun_ajaran, deleted_at: null },
      attributes: ["id_ujian", "jenis_ujian"],
      order: [["id_ujian", "ASC"]],
    });

    // Ambil semua nilai modul dari tabel nilai
    const listNilai = await Nilai.findAll({
      where: { id_kelas_tahun_ajaran, deleted_at: null },
      include: [
        {
          model: User,
          as: "siswa",
          attributes: ["id_user", "nama"],
        },
        {
          model: Modul,
          as: "modul",
          attributes: ["id_modul"],
        },
      ],
    });

    // Buat map nilai modul
    const nilaiMap = {};
    for (const n of listNilai) {
      const idUser = n.siswa?.id_user;
      const idModul = n.id_modul;
      if (!idUser) continue;

      if (!nilaiMap[idUser]) nilaiMap[idUser] = {};
      if (idModul) nilaiMap[idUser][`modul_${idModul}`] = n.nilai;
    }

    // === Ambil nilai ujian dari jawaban (langsung jumlah total) ===
    for (const ujian of ujianList) {
      const soalList = await Soal.findAll({
        where: { id_ujian: ujian.id_ujian, deleted_at: null },
        attributes: ["id_soal"],
      });

      const soalIds = soalList.map((s) => s.id_soal);

      for (const siswa of siswaList) {
        const jawabanList = await JawabanUjian.findAll({
          where: {
            id_user: siswa.id_user,
            id_soal: soalIds,
            deleted_at: null,
          },
          attributes: ["nilai"],
        });

        // Jumlahkan semua nilai dari jawaban ujian siswa
        const totalNilai = jawabanList.reduce(
          (sum, j) => sum + (parseInt(j.nilai) || 0),
          0
        );

        if (!nilaiMap[siswa.id_user]) nilaiMap[siswa.id_user] = {};
        nilaiMap[siswa.id_user][`ujian_${ujian.id_ujian}`] = totalNilai;
      }
    }

    // Header tabel
    const headers = [
      { field: "nama", label: "Nama Siswa", width: "300px" },
      ...modulList.map((m) => ({
        field: `modul_${m.id_modul}`,
        label: m.jenis_modul || m.nama_modul || `Modul ${m.id_modul}`,
        width: "150px",
      })),
      ...ujianList.map((u) => ({
        field: `ujian_${u.id_ujian}`,
        label: u.jenis_ujian,
        width: "150px",
      })),
    ];

    // Rows per siswa
    const rows = siswaList.map((s) => {
      const row = { nama: s.nama };
      for (const m of modulList) {
        row[`modul_${m.id_modul}`] = nilaiMap[s.id_user]?.[`modul_${m.id_modul}`] ?? "-";
      }
      for (const u of ujianList) {
        row[`ujian_${u.id_ujian}`] = nilaiMap[s.id_user]?.[`ujian_${u.id_ujian}`] ?? "-";
      }
      return row;
    });

    return res.status(200).send({
      message: "success",
      headers,
      rows,
    });
  } catch (err) {
    console.error("Get nilai guru error:", err);
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ================== GET NILAI BY KELAS (UNTUK SISWA) ==================
router.get("/siswa/:id_tahun_ajaran", authenticateToken, async (req, res) => {
  try {
    const { id_tahun_ajaran } = req.params;
    const id_user = req.user.id_user;

    // Ambil semua kelas siswa di tahun ajaran
    const kelasSiswaList = await KelasSiswa.findAll({
      where: { id_siswa: id_user, id_tahun_ajaran, deleted_at: null, },
      include: [
        {
          model: KelasTahunAjaran,
          as: "KelasTahunAjaranRef",
          include: [{ model: Pelajaran, attributes: ["nama_pelajaran"] }],
          attributes: ["id_kelas_tahun_ajaran", "id_pelajaran"],
        },
      ],
    });

    if (!kelasSiswaList.length) {
      return res.status(404).send({
        message: "Siswa belum terdaftar di kelas manapun untuk tahun ajaran ini",
      });
    }

    const kelasIds = kelasSiswaList
      .map((k) => k.KelasTahunAjaranRef?.id_kelas_tahun_ajaran)
      .filter(Boolean);

    // Ambil modul & ujian
    const [modulList, ujianList] = await Promise.all([
      Modul.findAll({
        where: { id_kelas_tahun_ajaran: kelasIds, deleted_at: null },
        attributes: ["id_modul", "id_kelas_tahun_ajaran", "jenis_modul", "nama_modul"],
      }),
      Ujian.findAll({
        where: { id_kelas_tahun_ajaran: kelasIds, deleted_at: null },
        attributes: ["id_ujian", "id_kelas_tahun_ajaran", "jenis_ujian"],
      }),
    ]);

    // Ambil nilai modul dari tabel Nilai
    const nilaiList = await Nilai.findAll({
      where: { id_kelas_tahun_ajaran: kelasIds, id_siswa: id_user, deleted_at: null },
      attributes: ["id_modul", "id_ujian", "nilai", "id_kelas_tahun_ajaran"],
    });

    // Buat struktur hasil akhir per pelajaran
    const hasil = {};

    for (const kelas of kelasSiswaList) {
      const kelasTA = kelas.KelasTahunAjaranRef;
      if (!kelasTA) continue;

      const idKelasTA = kelasTA.id_kelas_tahun_ajaran;
      const namaPelajaran = kelasTA.Pelajaran?.nama_pelajaran || "Tanpa Nama";

      // Filter modul & ujian per kelas
      const modulKelas = modulList.filter((m) => m.id_kelas_tahun_ajaran === idKelasTA);
      const ujianKelas = ujianList.filter((u) => u.id_kelas_tahun_ajaran === idKelasTA);

      // Buat header
      const headers = [
        ...modulKelas.map((m) => ({
          field: `modul_${m.id_modul}`,
          label: m.jenis_modul || m.nama_modul || `Modul ${m.id_modul}`,
          width: "150px",
        })),
        ...ujianKelas.map((u) => ({
          field: `ujian_${u.id_ujian}`,
          label: u.jenis_ujian || `Ujian ${u.id_ujian}`,
          width: "150px",
        })),
      ];

      // Buat row nilai
      const row = {};

      // === Nilai Modul ===
      for (const m of modulKelas) {
        const nilai = nilaiList.find(
          (n) => n.id_modul === m.id_modul && n.id_kelas_tahun_ajaran === idKelasTA
        );
        row[`modul_${m.id_modul}`] = nilai ? nilai.nilai : "-";
      }

      // === Nilai Ujian (langsung dari jawaban_ujian, dijumlahkan) ===
      for (const u of ujianKelas) {
        const soalList = await Soal.findAll({
          where: { id_ujian: u.id_ujian, deleted_at: null },
          attributes: ["id_soal"],
        });

        const soalIds = soalList.map((s) => s.id_soal);

        const jawabanList = await JawabanUjian.findAll({
          where: {
            id_user,
            id_soal: soalIds,
            deleted_at: null,
          },
          attributes: ["nilai"],
        });

        const totalNilai = jawabanList.reduce(
          (sum, j) => sum + (parseInt(j.nilai) || 0),
          0
        );

        row[`ujian_${u.id_ujian}`] = jawabanList.length > 0 ? totalNilai : "-";
      }

      hasil[namaPelajaran] = {
        headers,
        rows: [row],
      };
    }

    return res.status(200).send({ message: "success", ...hasil });
  } catch (err) {
    console.error("Get nilai siswa error:", err);
    return res.status(500).send({
      message: "Terjadi kesalahan",
      error: err.message,
    });
  }
});

// ================== GET BY ID ==================
router.get("/:id_nilai", authenticateToken, async (req, res) => {
  try {
    const { id_nilai } = req.params;

    const nilai = await Nilai.findOne({
      where: { id_nilai, deleted_at: null },
      include: [
        { model: User, as: "siswa", attributes: ["id_user", "nama", "email"] },
        { model: KelasTahunAjaran, as: "kelasTahunAjaran" },
      ],
    });

    if (!nilai) {
      return res.status(404).send({ message: "Data nilai tidak ditemukan" });
    }

    return res.status(200).send({ message: "success", data: nilai });
  } catch (err) {
    console.error("Get nilai by id error:", err);
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

// ================== DELETE (Soft Delete) ==================
router.delete("/:id_nilai", authenticateToken, authorizeRole("Guru"), async (req, res) => {
  try {
    const { id_nilai } = req.params;
    const nilai = await Nilai.findByPk(id_nilai);

    if (!nilai) {
      return res.status(404).send({ message: "Data nilai tidak ditemukan" });
    }

    await nilai.update({ deleted_at: new Date() });

    return res.status(200).send({ message: "Berhasil menghapus data nilai" });
  } catch (err) {
    console.error("Delete nilai error:", err);
    return res
      .status(500)
      .send({ message: "Terjadi kesalahan", error: err.message });
  }
});

module.exports = router;
