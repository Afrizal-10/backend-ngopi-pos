const User = require("../model/User");

// create kasir
exports.createKasir = async (req, res) => {
  try {
    const {name, email, password} = req.body;

    // cek apakah email sudah digunakan
    const exists = await User.findOne({email});
    if (exists) return res.status(400).json({message: "Email sudah digunakan"});

    // buat user baru dengan role kasir
    const kasir = await User.create({
      name,
      email,
      password,
      role: "kasir",
    });
    res.status(201).json({message: "Kasir created successfully", kasir});
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// get all kasir
exports.getAllKasir = async (req, res) => {
  try {
    const kasirs = await User.find({role: "kasir"}).select("-password");
    res.status(200).json(kasirs);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// get total kasir
exports.getTotalKasir = async (req, res) => {
  try {
    const count = await User.countDocuments({role: "kasir"});
    res.status(200).json({count});
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// get my profile
exports.getMyProfile = async (req, res) => {
  try {
    // req user berasal dari middleware auth
    const user = await User.findById(req.user._id).select("-password");

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// update kasir
exports.updateKasir = async (req, res) => {
  try {
    const {id} = req.params;
    const {name, email} = req.body;
    const updated = await User.findByIdAndUpdate(
      id,
      {name, email},
      {new: true},
    );
    res.json({message: "Kasir updated successfully", updated});
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// update my profile
exports.updateMyProfile = async (req, res) => {
  try {
    const {name, email} = req.body;

    // Cek email duplikat
    if (email && email !== req.user.email) {
      const exists = await User.findOne({email});
      if (exists) {
        return res.status(400).json({message: "Email sudah digunakan"});
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      {name, email},
      {new: true},
    ).select("-password");

    res.status(200).json({
      success: true,
      data: updated,
      message: "Profil berhasil diupdate",
    });
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};
// delete kasir
exports.deleteKasir = async (req, res) => {
  try {
    const {id} = req.params;
    await User.findByIdAndDelete(id);
    res.json({message: "Delete kasir successfully"});
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};
