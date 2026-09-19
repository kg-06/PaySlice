const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const merchantRoutes = require("./routes/merchantRoutes");
const app = express();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

app.use("/api/merchants", merchantRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({
    message: "UPI Splitter API is running",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});