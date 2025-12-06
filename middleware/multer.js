const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// ===================== PROFILE UPLOAD =====================
const storageProfile = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/profile_pictures");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${file.fieldname}-${Date.now()}-${uuidv4()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

const fileFilterProfile = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file gambar yang diperbolehkan!"));
  }
};

const uploadProfile = multer({
  storage: storageProfile,
  fileFilter: fileFilterProfile,
});

// ===================== PENGUMUMAN UPLOAD =====================
const storagePengumuman = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/pengumuman");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${file.fieldname}-${Date.now()}-${uuidv4()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

const fileFilterPengumuman = (req, file, cb) => {
  const allowedTypes = /pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype === "application/pdf";

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file PDF yang diperbolehkan!"));
  }
};

const uploadPengumuman = multer({
  storage: storagePengumuman,
  fileFilter: fileFilterPengumuman,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ===================== RAPOR UPLOAD =====================
const storageRapor = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/rapor");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${file.fieldname}-${Date.now()}-${uuidv4()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

const fileFilterRapor = (req, file, cb) => {
  const allowedTypes = /pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype === "application/pdf";

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file PDF yang diperbolehkan untuk rapor!"));
  }
};

const uploadRapor = multer({
  storage: storageRapor,
  fileFilter: fileFilterRapor,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ===================== MATERI UPLOAD =====================
const storageMateri = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/materi");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${file.fieldname}-${Date.now()}-${uuidv4()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

const fileFilterMateri = (req, file, cb) => {
  const allowedTypes =
    /pdf|ppt|pptx|doc|docx|xls|xlsx|txt|jpg|jpeg|png|gif|mp4|mov|mkv|avi|webm|ogg/;

  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  if (extname) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Format file tidak diperbolehkan! Hanya pdf, ppt, doc, excel, txt, gambar, dan video yang diperbolehkan."
      )
    );
  }
};

const uploadMateri = multer({
  storage: storageMateri,
  fileFilter: fileFilterMateri,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB untuk video
});

// ===================== PENGUMPULAN MODUL UPLOAD =====================
const storagePengumpulanModul = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/pengumpulan_modul");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${file.fieldname}-${Date.now()}-${uuidv4()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

const fileFilterPengumpulanModul = (req, file, cb) => {
  const allowedTypes = /pdf|ppt|pptx|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (extname) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file dengan format PDF, PPT, atau Word yang diperbolehkan!"));
  }
};

const uploadPengumpulanModul = multer({
  storage: storagePengumpulanModul,
  fileFilter: fileFilterPengumpulanModul,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ===================== SOAL UPLOAD =====================
const storageSoal = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/soal");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${file.fieldname}-${Date.now()}-${uuidv4()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});

const fileFilterSoal = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file gambar (jpg, jpeg, png, gif) yang diperbolehkan untuk soal!"));
  }
};

const uploadSoal = multer({
  storage: storageSoal,
  fileFilter: fileFilterSoal,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

module.exports = {
  uploadProfile,
  uploadPengumuman,
  uploadRapor,
  uploadMateri,
  uploadPengumpulanModul,
  uploadSoal,
};