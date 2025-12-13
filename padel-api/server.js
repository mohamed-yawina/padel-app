const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const terrainRoutes = require("./routes/terrainRoutes");
const reservationRoutes = require("./routes/reservationRoutes");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" })); // 🔥 important pour Base64

// servir les images
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/terrains", terrainRoutes);
app.use("/api/reservations", reservationRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connecté");
    app.listen(5000, "0.0.0.0", () =>
      console.log("Serveur : " + process.env.SERVER_URL)
    );
  })
  .catch((err) => console.log(err));
