const express = require("express");
require("dotenv").config();
const cors = require("cors");

const app = express();

const { connectDB } = require("./helpers/dbCon");

// const compRoutes = require("./routes/compilerRoutes");
const contestRoutes = require("./routes/contestRoutes");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");

const port = process.env.PORT || 8080;

// Connect to Database
connectDB();

// Initialize Cron Jobs (Removed: using lazy/computed status)
// const initCron = require("./services/cron");
// initCron();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("SOSCEvMan API is running...");
});

// Routes

app.use("/api/auth", authRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/test", contestRoutes);

const submitRoutes = require("./routes/submitRoutes");
app.use("/api/submit", submitRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
