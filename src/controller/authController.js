const jwt = require("jsonwebtoken");
const User = require("../model/User");

// login (admin & kasir)
exports.login = async (req, res) => {
  try {
    // ambil email dan password dari request body
    const {email, password} = req.body;

    // cari user berdasarkan email
    const user = await User.findOne({email}).select("+password");
    // jika user tidak ditemukan
    if (!user) {
      return res.status(401).json({message: "Email atau password salah"});
    }

    // jika user tidak aktif
    if (!user.isActive) {
      return res.status(403).json({message: "Akun tidak aktif"});
    }

    // cek password yang diinput dengan password di database
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({message: "Email atau password salah"});
    }

    // generate jwt token (berisi id dan role)
    const token = jwt.sign(
      {id: user._id, role: user.role},
      process.env.JWT_SECRET,
      {expiresIn: "1d"},
    );

    // kirim token + data user
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};
