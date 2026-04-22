const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Project = require("../models/Project");

const router = express.Router();

function mapUserSummary(user, currentUser) {
  const isFollowing = currentUser
    ? user.followers.some((followerId) => followerId.toString() === currentUser._id.toString())
    : false;

  return {
    id: user._id,
    name: user.name,
    username: user.username,
    bio: user.bio,
    followersCount: user.followers.length,
    followingCount: user.following.length,
    isFollowing,
  };
}

async function buildProfile(user, currentUser) {
  const projects = await Project.find({ owner: user._id }).sort({ createdAt: -1 }).populate("owner", "name username");
  const totalRatings = projects.reduce((sum, project) => sum + project.ratings.length, 0);
  const ratingSum = projects.reduce(
    (sum, project) => sum + project.ratings.reduce((innerSum, rating) => innerSum + rating.value, 0),
    0
  );

  return {
    user: {
      ...mapUserSummary(user, currentUser),
      id: user._id,
      projectsCount: projects.length,
      averageRating: totalRatings ? (ratingSum / totalRatings).toFixed(1) : "0.0",
      followers: await User.find({ _id: { $in: user.followers } }, "name username").sort({ name: 1 }),
      following: await User.find({ _id: { $in: user.following } }, "name username").sort({ name: 1 }),
    },
    projects: projects.map((project) => {
      const averageRating = project.ratings.length
        ? (project.ratings.reduce((sum, rating) => sum + rating.value, 0) / project.ratings.length).toFixed(1)
        : "0.0";

      return {
        id: project._id,
        name: project.name,
        githubLink: project.githubLink,
        description: project.description,
        owner: project.owner,
        commentsCount: project.comments.length,
        averageRating,
        createdAt: project.createdAt,
      };
    }),
  };
}

router.get("/", async (req, res) => {
  try {
    const { search = "" } = req.query;
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { username: { $regex: search, $options: "i" } },
            { bio: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(query).sort({ createdAt: -1 }).limit(20);

    let currentUser = null;
    const header = req.headers.authorization || "";
    if (header.startsWith("Bearer ")) {
      try {
        const token = header.slice(7);
        const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET);
        if (mongoose.isValidObjectId(decoded.userId)) {
          currentUser = await User.findById(decoded.userId);
        }
      } catch (error) {
        currentUser = null;
      }
    }

    return res.json({
      users: users.map((user) => mapUserSummary(user, currentUser)),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch users." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let currentUser = null;
    const header = req.headers.authorization || "";
    if (header.startsWith("Bearer ")) {
      try {
        const token = header.slice(7);
        const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET);
        if (mongoose.isValidObjectId(decoded.userId)) {
          currentUser = await User.findById(decoded.userId);
        }
      } catch (error) {
        currentUser = null;
      }
    }

    return res.json(await buildProfile(user, currentUser));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch profile." });
  }
});

router.post("/:id/follow", auth, async (req, res) => {
  try {
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({ message: "You cannot follow yourself." });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const alreadyFollowing = req.user.following.some((id) => id.toString() === targetUser._id.toString());

    if (alreadyFollowing) {
      req.user.following = req.user.following.filter((id) => id.toString() !== targetUser._id.toString());
      targetUser.followers = targetUser.followers.filter((id) => id.toString() !== req.user._id.toString());
    } else {
      req.user.following.push(targetUser._id);
      targetUser.followers.push(req.user._id);
    }

    await req.user.save();
    await targetUser.save();

    return res.json({
      following: !alreadyFollowing,
      followersCount: targetUser.followers.length,
      followingCount: req.user.following.length,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update follow status." });
  }
});

module.exports = router;
