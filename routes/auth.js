// const express = require("express");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const User = require("../models/User");
// const auth = require("../middleware/auth");

// const router = express.Router();

// function signToken(userId) {
//   return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
// }

// function sanitizeUser(user) {
//   return {
//     id: user._id,
//     name: user.name,
//     username: user.username,
//     email: user.email,
//     bio: user.bio,
//     followersCount: user.followers.length,
//     followingCount: user.following.length,
//   };
// }

// router.post("/register", async (req, res) => {
//   try {
//     const { name, username, email, password, bio = "" } = req.body;

//     if (!name || !username || !email || !password) {
//       return res.status(400).json({ message: "Name, username, email, and password are required." });
//     }

//     const normalizedEmail = email.trim().toLowerCase();
//     const normalizedUsername = username.trim().toLowerCase();

//     const existingUser = await User.findOne({
//       $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
//     });

//     if (existingUser) {
//       return res.status(409).json({ message: "Email or username already exists." });
       
//     }

//     const passwordHash = await bcrypt.hash(password, 10);

//     const user = await User.create({
//       name: name.trim(),
//       username: normalizedUsername,
//       email: normalizedEmail,
//       passwordHash,
//       bio: bio.trim(),
//     });

//     return res.status(201).json({
//       token: signToken(user._id.toString()),
//       user: sanitizeUser(user),
//     });
//   } catch (error) {
//     return res.status(500).json({ message: "Failed to register user." });
//   }
// });

// router.post("/login", async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: "Email and password are required." });
//     }

//     const user = await User.findOne({ email: email.trim().toLowerCase() });
//     if (!user) {
//       return res.status(401).json({ message: "Invalid email or password." });
//     }

//     const validPassword = await bcrypt.compare(password, user.passwordHash);
//     if (!validPassword) {
//       return res.status(401).json({ message: "Invalid email or password." });
//     }

//     return res.json({
//       token: signToken(user._id.toString()),
//       user: sanitizeUser(user),
//     });
//   } catch (error) {
//     return res.status(500).json({ message: "Failed to login." });
//   }
// });

// router.get("/me", auth, async (req, res) => {
//   return res.json({
//     user: sanitizeUser(req.user),
//   });
// });

// module.exports = router;







const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

// 🔐 Generate JWT
function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// 🧹 Remove sensitive fields
function sanitizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    bio: user.bio,
    followersCount: user.followers?.length || 0,
    followingCount: user.following?.length || 0,
  };
}

// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const { name, username, email, password, bio = "" } = req.body;

    // 🔍 Validation
    if (!name || !username || !email || !password) {
      return res.status(400).json({
        message: "Name, username, email, and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    // 🔍 Check existing user
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email or username already exists.",
      });
    }

    // 🔐 Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 👤 Create user
    const user = await User.create({
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      bio: bio.trim(),
    });

    return res.status(201).json({
      token: signToken(user._id.toString()),
      user: sanitizeUser(user),
    });

  } catch (error) {
    console.error("Register error:", error);

    // 🔥 Handle Mongo duplicate error
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email or username already exists.",
      });
    }

    return res.status(500).json({
      message: "Server error during registration.",
    });
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    return res.json({
      token: signToken(user._id.toString()),
      user: sanitizeUser(user),
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Server error during login.",
    });
  }
});

// ================= CURRENT USER =================
router.get("/me", auth, async (req, res) => {
  return res.json({
    user: sanitizeUser(req.user),
  });
});

module.exports = router;
