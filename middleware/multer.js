const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid"); // tambahkan uuid

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

// Filter hanya file gambar
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

const uploadProfile = multer({ storage: storageProfile, fileFilter: fileFilterProfile });


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

// Filter hanya file PDF
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


// ===================== EXPORT =====================
module.exports = {
  uploadProfile,
  uploadPengumuman,
};
