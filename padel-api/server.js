const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const terrainRoutes = require("./routes/terrainRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const stripeRoutes = require("./routes/stripeRoutes"); // Nouvelle route

const app = express();

app.use(cors());

// Monter la route Stripe avant le body parser JSON global afin que
// le webhook Stripe puisse utiliser express.raw() pour vérifier la signature.
app.use('/api/stripe', stripeRoutes);

app.use(express.json({ limit: "50mb" }));

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