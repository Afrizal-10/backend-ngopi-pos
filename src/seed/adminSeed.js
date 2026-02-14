require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../model/User");

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const adminExists = await User.findOne({role: "admin"});
    if (adminExists) {
      console.log("Admin already exists");
      process.exit();
    }

    await User.create({
      name: "Admin Ngopi",
      email: "admin@ngopi.com",
      password: "admin123",
      role: "admin",
    });

    console.log("Admin seeded successfully");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedAdmin();
