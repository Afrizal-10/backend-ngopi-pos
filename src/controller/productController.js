const Product = require("../model/Product");
const cloudinary = require("../config/cloudinary");
const Transaction = require("../model/Transaction");

// Get all product (admin & kasir)
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find({isAvailable: true})
      .populate("category", "name")
      .sort({
        createdAt: -1,
      });

    res.json(products);
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

// get total product
exports.getTotalProducts = async (req, res) => {
  try {
    const count = await Product.countDocuments({isAvailable: true});
    res.status(200).json({count});
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// create product (admin)
exports.createProduct = async (req, res) => {
  try {
    const {name, price, category, stock} = req.body;

    // validasi field wajib
    if (!name || !price || !category) {
      return res.status(400).json({message: "Required fields missing"});
    }

    let imageUrl = null;

    // upload gambar ke cloudinary jika ada file
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({folder: "ngopi-pos/products"}, (error, result) => {
            if (error) return reject(error);
            resolve(result);
          })
          .end(req.file.buffer);
      });

      imageUrl = uploadResult.secure_url;
    }

    // simpan product baru
    const product = await Product.create({
      name,
      price,
      category,
      stock,
      image: imageUrl,
    });

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({message: error.message});
  }
};

// Update product (admin)
exports.updateProduct = async (req, res) => {
  try {
    const data = req.body;

    // jika ada gambar baru update ke cloudinary
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({folder: "ngopi-pos/products"}, (error, result) => {
            if (error) return reject(error);
            resolve(result);
          })
          .end(req.file.buffer);
      });

      data.image = uploadResult.secure_url;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, data, {
      new: true,
    });

    if (!product) {
      return res.status(404).json({message: "Product not found"});
    }

    res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    res.status(400).json({message: error.message});
  }
};

// Delete product (soft delete)
// Delete product (soft delete)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({message: "Product not found"});
    }

    product.isAvailable = false;

    // tambahin ini
    await product.save({validateBeforeSave: false});

    res.json({message: "Delete product successfully"});
  } catch (error) {
    res.status(400).json({message: error.message});
  }
};

// Get best selling products
exports.getBestSellingProducts = async (req, res) => {
  try {
    const {range = "month", limit = 10} = req.query;

    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    // tentukan range waktu
    if (range === "week") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (range === "month") {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (range === "year") {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const data = await Transaction.aggregate([
      {
        $match: {
          status: "paid",
          createdAt: {$gte: startDate},
          items: {$exists: true, $ne: []},
        },
      },
      {$unwind: "$items"}, // pecah array items
      {
        $group: {
          _id: "$items.product",
          name: {$first: "$items.name"},
          price: {$first: "$items.price"},
          category: {$first: "$items.category"},
          totalQty: {$sum: "$items.quantity"},
          totalSales: {$sum: "$items.subtotal"},
        },
      },
      {$sort: {totalQty: -1}},
      {$limit: Number(limit)},
    ]);

    res.json(data);
  } catch (err) {
    console.error("Best selling error:", err);
    res.status(500).json({message: err.message});
  }
};

// Get sales by category (distribusi kategori)
exports.getSalesByCategory = async (req, res) => {
  try {
    const {range = "month"} = req.query;

    let startDate = new Date();

    // tentukan tanggal awal berdasarkan range
    switch (range.toLowerCase()) {
      case "hari":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "minggu":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "bulan":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "tahun":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const salesByCategory = await Transaction.aggregate([
      // filter transaksi berdasarkan tanggal dan status
      {
        $match: {
          createdAt: {$gte: startDate},
          status: "paid",
        },
      },
      // pecah array items agar bisa dihitung per product
      {$unwind: "$items"},
      {
        // kelompokkan berdasarkan kategori product
        $group: {
          _id: "$items.category",
          // total quantity terjual
          totalSold: {$sum: "$items.quantity"},
          // total pendapatan
          totalRevenue: {
            $sum: {
              $multiply: ["$items.quantity", "$items.price"],
            },
          },
          // hitung jumlah transaksi
          transactionCount: {$sum: 1},
        },
      },
      // urutkan dari yang paling laku
      {$sort: {totalSold: -1}},
    ]);

    res.status(200).json(salesByCategory);
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

// Get sales trend over time (untuk line chart)
exports.getSalesTrend = async (req, res) => {
  try {
    const {range = "month"} = req.query;

    let groupFormat;
    let startDate = new Date();

    // tentukan format grouping berdasarkan range
    switch (range.toLowerCase()) {
      case "hari":
        startDate.setHours(0, 0, 0, 0);
        groupFormat = {
          $dateToString: {
            format: "%H:00",
            date: "$createdAt",
          },
        };
        break;
      case "minggu":
        startDate.setDate(startDate.getDate() - 7);
        groupFormat = {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
          },
        };
        break;
      case "bulan":
        startDate.setMonth(startDate.getMonth() - 1);
        groupFormat = {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
          },
        };
        break;
      case "tahun":
        startDate.setFullYear(startDate.getFullYear() - 1);
        groupFormat = {
          $dateToString: {
            format: "%Y-%m",
            date: "$createdAt",
          },
        };
        break;
    }

    const salesTrend = await Transaction.aggregate([
      // filter transaksi sesuai range
      {
        $match: {
          createdAt: {$gte: startDate},
          status: "completed",
        },
      },
      {
        // kelompokkan berdasarkan waktu jam, hari, bulan
        $group: {
          _id: groupFormat,
          // total omset
          totalRevenue: {$sum: "$grandTotal"},
          // jumlah transaksi
          totalTransactions: {$sum: 1},
          // total item dalam transaksi
          totalItems: {$sum: {$size: "$items"}},
        },
      },
      // urutkan berdasarkan waktu
      {$sort: {_id: 1}},
    ]);

    // Format response untuk chart
    const formattedData = salesTrend.map((item) => ({
      date: item._id,
      total: item.totalRevenue,
      transactions: item.totalTransactions,
      items: item.totalItems,
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};
