const Transaction = require("../model/Transaction");

// sales report, mengambil laporan penjualan berdasarkan range waktu hari, minggu, bulan, tahun
exports.getSalesReport = async (req, res) => {
  try {
    // ambil range dari query
    const {range = "day"} = req.query;
    // set tanggal awal (mulai dari jam 00.00 hari ini)
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    // tentukan range waktu
    switch (range) {
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        break;
    }

    // ambil transaksi dengan status paid
    const transactions = await Transaction.find({
      createdAt: {$gte: startDate},
      status: "paid",
    })
      .populate("cashier", "name")
      .sort({createdAt: -1});

    // Hitung ringkasan laporan penjualan
    const summary = {
      omzet: transactions.reduce((total, transaction) => {
        return total + transaction.grandTotal;
      }, 0),
      tax: transactions.reduce((total, transaction) => {
        return total + (transaction.taxAmount || 0);
      }, 0),
      discount: transactions.reduce((total, transaction) => {
        return total + (transaction.discountAmount || 0);
      }, 0),
      // Jumlah total transaksi
      totalTransaction: transactions.length,
    };

    res.json({summary, transactions});
  } catch (err) {
    console.error("Report error:", err);
    res.status(500).json({message: err.message});
  }
};

// recent transaksi, mengambil transaksi terbaru, admin lihat semua transaksi, kasir hanya lihat transaksi sendirinya
exports.getRecentTransactions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    let filter = {status: "paid"};

    // Kalau bukan admin, filter berdasarkan cashier
    if (req.user.role !== "admin") {
      filter.cashier = req.user._id;
    }

    const transactions = await Transaction.find(filter)
      .populate("cashier", "name")
      .sort({createdAt: -1})
      .limit(limit);

    res.json(transactions);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// weekly performance (kasir), menampilkan total penjualan 7 hari terakhir
exports.getWeeklyPerformance = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    // Ambil total penjualan kasir 7 hari terakhir, dikelompokkan per hari
    const data = await Transaction.aggregate([
      {
        $match: {
          cashier: req.user._id,
          status: "paid",
          createdAt: {$gte: sevenDaysAgo},
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {format: "%Y-%m-%d", date: "$createdAt"},
          },
          amount: {$sum: "$grandTotal"},
        },
      },
      {$sort: {_id: 1}},
    ]);

    // format tanggal jadi MM-DD
    const formatted = data.map((d) => ({
      day: d._id.slice(5),
      amount: d.amount,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// daily stats (kasir), total hari ini, jumlah transaksi hari ini, total bulan ini
exports.getDailyStatsCashier = async (req, res) => {
  try {
    // set range hari ini
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Aggregate hari ini
    const data = await Transaction.aggregate([
      {
        $match: {
          cashier: req.user._id,
          status: "paid",
          createdAt: {$gte: todayStart, $lte: todayEnd},
        },
      },
      {
        $group: {
          _id: null,
          total: {$sum: "$grandTotal"},
          transactionCount: {$sum: 1},
        },
      },
    ]);

    // Aggregate bulan ini
    const monthly = await Transaction.aggregate([
      {
        $match: {
          cashier: req.user._id,
          status: "paid",
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {$sum: "$grandTotal"},
        },
      },
    ]);

    res.json({
      today: data[0]?.total || 0,
      transactionCount: data[0]?.transactionCount || 0,
      monthly: monthly[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// sales data (admin chart)
exports.getSalesData = async (req, res) => {
  try {
    const data = await Transaction.aggregate([
      {$match: {status: "paid"}},
      {
        $group: {
          _id: {
            $dateToString: {format: "%Y-%m-%d", date: "$createdAt"},
          },
          total: {$sum: "$grandTotal"},
        },
      },
      {$sort: {_id: 1}},
      {$project: {date: "$_id", total: 1, _id: 0}},
    ]);

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// daily stats (admin)
exports.getDailyStats = async (req, res) => {
  try {
    // awal hari ini (00.00)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // awal hari kemarin (00.00)
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);

    // akhir hari kemarin
    const yesterdayEnd = new Date(todayStart);
    yesterdayEnd.setMilliseconds(-1);

    // data hari ini
    const todayData = await Transaction.aggregate([
      {$match: {createdAt: {$gte: todayStart}, status: "paid"}},
      {$group: {_id: null, total: {$sum: "$grandTotal"}, count: {$sum: 1}}},
    ]);

    // data kemarin
    const yesterdayData = await Transaction.aggregate([
      {
        $match: {
          createdAt: {$gte: yesterdayStart, $lte: yesterdayEnd},
          status: "paid",
        },
      },
      {$group: {_id: null, total: {$sum: "$grandTotal"}, count: {$sum: 1}}},
    ]);

    res.status(200).json({
      today: todayData[0]?.total || 0,
      yesterday: yesterdayData[0]?.total || 0,
      countToday: todayData[0]?.count || 0,
      countYesterday: yesterdayData[0]?.count || 0,
    });
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};
