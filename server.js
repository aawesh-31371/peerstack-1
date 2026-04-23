require("dotenv").config();
const cors = require("cors");

const path = require("path");
const express = require("express");
const morgan = require("morgan");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const projectRoutes = require("./routes/projects");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  });
