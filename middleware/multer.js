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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
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
  const allowedTypes = /pdf|ppt|pptx|doc|docx|xls|xlsx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (extname) {
    cb(null, true);
  } else {
    cb(new Error("Hanya file dengan format pdf, ppt, word, excel, atau txt yang diperbolehkan!"));
  }
};

const uploadMateri = multer({
  storage: storageMateri,
  fileFilter: fileFilterMateri,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = {
  uploadProfile,
  uploadPengumuman,
  uploadRapor,
  uploadMateri,
  uploadPengumpulanModul,
};
