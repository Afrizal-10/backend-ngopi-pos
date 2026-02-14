const User = require("../model/User");
const Product = require("../model/Product");
const Transaction = require("../model/Transaction");

// dashboard total
exports.getDashboardTotals = async (req, res) => {
  try {
    // hitung jumlah user
    const totalKasir = await User.countDocuments({role: "kasir"});

    // hitung jumlah menu
    const totalMenu = await Product.countDocuments({isAvailable: true});

    // hitung total seluruh transaksi
    const totalTransaksi = await Transaction.countDocuments();

    // kirim bentuk json
    res.json({
      totalKasir,
      totalMenu,
      totalTransaksi,
    });
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};
