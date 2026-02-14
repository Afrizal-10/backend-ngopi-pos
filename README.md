# Ngopi POS Backend

Backend untuk aplikasi kasir `Ngopi POS` menggunakan **Node.js**, **Express**, dan **MongoDB**.  
Mendukung autentikasi, manajemen user, upload gambar ke Cloudinary, dan QR code untuk transaksi.

## Fitur

- 🔐 Autentikasi Admin & Kasir menggunakan **JWT**
- 👥 Manajemen pengguna (CRUD)
- ☁️ Upload gambar ke **Cloudinary**
- 📷 Generate QR Code untuk transaksi
- ✅ Validasi request dengan **express-validator**
- 📜 Logging request dengan **morgan**
- 🧑‍💻 Seed default admin via script khusus

## Teknologi

- **Node.js** & **Express** – Web framework
- **MongoDB** & **Mongoose** – Database
- **JWT** – Autentikasi
- **Cloudinary** – Upload gambar
- **bcryptjs** – Hash password
- **multer** – Upload file
- **qrcode** – Generate QR code
- **dotenv** – Konfigurasi environment
- **nodemon** – Auto restart saat development
