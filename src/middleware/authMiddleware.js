const jwt = require("jsonwebtoken");
const User = require("../model/User");

// protect route (wajib login)
exports.protect = async (req, res, next) => {
  // ambil header authorization
  const authHeader = req.headers.authorization;

  // cek apakah ada token dengan format "bearer"
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({message: "Unauthorized"});
  }

  try {
    // ambil token dari header
    const token = authHeader.split(" ")[1];

    // verifikasi token menggunakan jwt
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ambil data user berdasarkan id dari token
    const user = await User.findById(decoded.id).select("-password");

    // jika user tidak ditemukan
    if (!user) {
      return res.status(401).json({message: "User not found"});
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({message: "Token tidak valid"});
  }
};

// admin, membatasi akses hanya untuk role admin
exports.admin = (req, res, next) => {
  // cek apakah user yang login memiliki role admin
  if (req.user.role !== "admin") {
    return res.status(403).json({message: "Admin access only"});
  }
  next();
};
