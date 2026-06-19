const Transaction = require("../model/Transaction");
const Product = require("../model/Product");
const QRCode = require("qrcode");

// generate unique invoice number
const generateInvoiceNumber = () => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const unique = Date.now().toString().slice(-6);
  return `INV-${today}-${unique}`;
};

// create transaction (kasir)
exports.createTransaction = async (req, res) => {
  try {
    // ambil data dari request
    const {
      items, // detail transaksi (produk yang dibeli)
      paymentMethod,
      paidAmount,
      taxPercent = 11,
      discount = 0,
      customerName = "Customer",
      customerNote = "",
    } = req.body;

    // validation
    if (!items || items.length === 0) {
      return res.status(400).json({message: "Items required"});
    }

    if (!paymentMethod) {
      return res.status(400).json({message: "Payment method required"});
    }

    if (!paidAmount || paidAmount <= 0) {
      return res.status(400).json({message: "Paid amount invalid"});
    }

    let subtotalAmount = 0;
    const transactionItems = [];

    // validation product dan hitung subtotal
    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product || !product.isAvailable) {
        return res.status(404).json({message: `Product not available`});
      }

      if (product.stock < item.qty) {
        return res.status(400).json({
          message: `Stock ${product.name} not enough. Available: ${product.stock}`,
        });
      }

      const subtotal = product.price * item.qty;
      subtotalAmount += subtotal;

      transactionItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.qty,
        subtotal,
      });
    }

    // hitung pajak, diskon, total
    const taxAmount = Math.round((subtotalAmount * taxPercent) / 100);
    const discountAmount = Math.round((subtotalAmount * discount) / 100);
    const grandTotal = subtotalAmount + taxAmount - discountAmount;

    if (paidAmount < grandTotal) {
      return res.status(400).json({
        message: `Paid amount not enough. Total: ${grandTotal}`,
      });
    }

    const changeAmount = paidAmount - grandTotal;

    // generate invoice number
    const invoiceNumber = generateInvoiceNumber();

    // simpan transaction ke database
    const transaction = await Transaction.create({
      invoiceNumber,
      cashier: req.user._id,
      items: transactionItems,
      subtotalAmount,
      taxPercent,
      taxAmount,
      discount,
      discountAmount,
      grandTotal,
      paymentMethod,
      paidAmount,
      changeAmount,
      status: "paid",
      customerName,
      customerNote,
    });

    // updated/kurangi stock
    for (const item of transactionItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {stock: -item.quantity},
      });
    }

    // isi QR dengan URL receipt
    const receiptUrl = `http://localhost:5173/receipt/${transaction.invoiceNumber}`;

    const qrCode = await QRCode.toDataURL(receiptUrl);

    res.status(201).json({
      message: "Transaction success",
      transaction,
      qrCode,
    });
  } catch (error) {
    console.error("Transaction Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// get public receipt
exports.getReceiptPublic = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      invoiceNumber: req.params.invoice,
    });

    if (!transaction) {
      return res.status(404).json({message: "Transaction not found"});
    }

    if (transaction.status !== "paid") {
      return res.status(400).json({message: "Transaction not valid"});
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

// get total paid transaction
exports.getTotalTransactions = async (req, res) => {
  try {
    const count = await Transaction.countDocuments({status: "paid"});
    res.status(200).json({count});
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// get all transaction
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("cashier", "name email")
      .sort({createdAt: -1});

    res.json(transactions);
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

// Get payment method (kasir)
exports.getPaymentMethodStats = async (req, res) => {
  try {
    const data = await Transaction.aggregate([
      {
        $match: {
          status: "paid",
          cashier: req.user._id,
        },
      },
      {
        $group: {
          _id: "$paymentMethod",
          count: {$sum: 1},
        },
      },
    ]);

    const result = {};
    data.forEach((item) => {
      result[item._id] = item.count;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({message: err.message});
  }
};

// get transaction detail (by invoice)
exports.getTransactionDetail = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      invoiceNumber: req.params.invoice,
    }).populate("cashier", "name");

    if (!transaction) {
      return res.status(404).json({message: "Transaction not found"});
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

// Get all kasir
exports.getKasirTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      cashier: req.user._id,
    }).sort({createdAt: -1});

    res.json(transactions);
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

// Cancel (kasir)
exports.cancelTransactionKasir = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({message: "Transaction not found"});
    }

    // hanya milik kasir sendiri
    if (transaction.cashier.toString() !== req.user._id.toString()) {
      return res.status(403).json({message: "Not your transaction"});
    }

    if (transaction.status !== "paid") {
      return res.status(400).json({message: "Cannot cancel"});
    }

    transaction.status = "cancelled";
    await transaction.save();

    // rollback stock
    for (const item of transaction.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: {stock: item.quantity},
      });
    }

    res.json({message: "Cancelled successfully"});
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};

// delete transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({message: "Transaction not found"});
    }

    await transaction.deleteOne();

    res.json({message: "Transaction deleted"});
  } catch (error) {
    res.status(500).json({message: error.message});
  }
};
