const Transaction = require("../model/Transaction");

// sales report, mengambil laporan penjualan berdasarkan range waktu hari, minggu, bulan, tahun
exports.getSalesReport = async (req, res) => {
  try {
    const {range = "day"} = req.query;

    let startDate = new Date();
    let endDate = new Date();

    // set end ke akhir hari ini
    endDate.setHours(23, 59, 59, 999);

    // set start awal hari
    startDate.setHours(0, 0, 0, 0);

    switch (range) {
      case "week":
        startDate.setDate(startDate.getDate() - 6); // 7 hari termasuk hari ini
        break;

      case "month":
        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        break;

      case "year":
        startDate = new Date(startDate.getFullYear(), 0, 1);
        break;

      default:
        break;
    }

    let filter = {
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
      status: "paid",
    };

    // kalau kasir hanya lihat transaksi sendiri
    if (req.user.role === "kasir") {
      filter.cashier = req.user._id;
    }

    const transactions = await Transaction.find(filter)
      .populate("cashier", "name")
      .sort({createdAt: -1});

    const summary = {
      omzet: transactions.reduce((t, trx) => t + trx.grandTotal, 0),
      tax: transactions.reduce((t, trx) => t + (trx.taxAmount || 0), 0),
      discount: transactions.reduce(
        (t, trx) => t + (trx.discountAmount || 0),
        0,
      ),
      totalTransaction: transactions.length,
    };

    res.json({summary, transactions});
  } catch (err) {
    console.error(err);
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
exports.getPerformance = async (req, res) => {
  try {
    const {range = "week"} = req.query;

    let startDate = new Date();
    let groupFormat = "%Y-%m-%d";

    // set awal hari ini
    startDate.setHours(0, 0, 0, 0);

    switch (range) {
      case "day":
        // hari ini → group per jam
        groupFormat = "%H:00";
        break;

      case "week":
        startDate.setDate(startDate.getDate() - 6);
        groupFormat = "%Y-%m-%d";
        break;

      case "month":
        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        groupFormat = "%Y-%m-%d";
        break;

      case "year":
        startDate = new Date(startDate.getFullYear(), 0, 1);
        groupFormat = "%Y-%m";
        break;
    }

    const data = await Transaction.aggregate([
      {
        $match: {
          status: "paid",
          cashier: req.user._id,
          createdAt: {$gte: startDate},
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupFormat,
              date: "$createdAt",
            },
          },
          amount: {$sum: "$grandTotal"},
        },
      },
      {$sort: {_id: 1}},
    ]);

    const formatted = data.map((d) => ({
      label: d._id,
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
