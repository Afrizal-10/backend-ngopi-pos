require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./src/config/db");

const app = express();

// connect database
connectDB();

// middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// routes
app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/kasir", require("./src/routes/kasirRoutes"));
app.use("/api/categories", require("./src/routes/categoryRoutes"));
app.use("/api/products", require("./src/routes/productRoutes"));
app.use("/api/transactions", require("./src/routes/transactionRoutes"));
app.use("/api/dashboard", require("./src/routes/dashboardRoutes"));
app.use("/api/reports", require("./src/routes/reportRoutes"));

// test root
app.get("/", (req, res) => {
  res.send("Ngopi POS API running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
