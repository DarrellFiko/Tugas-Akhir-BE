const jwt = require("jsonwebtoken");

// Ambil SECRET_KEY dari .env (fallback ke default kalau belum diset)
const SECRET_KEY = process.env.SECRET_KEY;

// Blacklist token (sementara in-memory, bisa pakai Redis/DB kalau production)
let tokenBlacklist = [];

// ========================== MIDDLEWARE CEK TOKEN ==========================
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).send({ message: "Token tidak ada" });

  if (tokenBlacklist.includes(token)) {
    return res
      .status(401)
      .send({ message: "Token sudah invalid, silakan login lagi" });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(401).send({ message: "Token tidak valid" });
    req.user = user;
    next();
  });
}

// ========================== MIDDLEWARE CEK ROLE ==========================
function authorizeRole(roles) {
  return (req, res, next) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .send({ message: `Hanya ${allowedRoles.join(" / ")} yang bisa mengakses endpoint ini` });
    }

    next();
  };
}


// ========================== LOGOUT HANDLER (BLACKLIST) ==========================
function addToBlacklist(token) {
  tokenBlacklist.push(token);
}

module.exports = {
  authenticateToken,
  authorizeRole,
  addToBlacklist,
  SECRET_KEY,
};
