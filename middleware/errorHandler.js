function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "Ukuran file terlalu besar. Maksimal 5 MB.",
      });
    }
    return res.status(400).json({ message: err.message });
  }
  next(err);
}

module.exports = { multerErrorHandler };
