// const mongoose = require("mongoose");

// async function connectDB() {
//   const mongoUri = process.env.MONGODB_URI;

//   if (!mongoUri) {
//     throw new Error("MONGODB_URI is missing. Add it to your .env file.");
//   }

//   await mongoose.connect(mongoUri);
//   console.log("MongoDB connected");
// }

// module.exports = connectDB;

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
