const express = require("express");
const auth = require("../middleware/auth");
const Project = require("../models/Project");
const User = require("../models/User");

const router = express.Router();

function mapProject(project, currentUser, followingSet = new Set()) {
  const averageRating = project.ratings.length
    ? (project.ratings.reduce((sum, rating) => sum + rating.value, 0) / project.ratings.length).toFixed(1)
    : "0.0";

  const currentUserRating = currentUser
    ? project.ratings.find((rating) => rating.user._id.toString() === currentUser._id.toString())?.value || 0
    : 0;

  return {
    id: project._id,
    name: project.name,
    githubLink: project.githubLink,
    description: project.description,
    owner: {
      id: project.owner._id,
      name: project.owner.name,
      username: project.owner.username,
      isFollowing: currentUser ? followingSet.has(project.owner._id.toString()) : false,
    },
    averageRating,
    ratingsCount: project.ratings.length,
    currentUserRating,
    commentsCount: project.comments.length,
    comments: project.comments
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((comment) => ({
        id: comment._id,
        text: comment.text,
        createdAt: comment.createdAt,
        user: {
          id: comment.user._id,
          name: comment.user.name,
          username: comment.user.username,
        },
      })),
    createdAt: project.createdAt,
  };
}

router.get("/", async (req, res) => {
  try {
    const { search = "", scope = "all", currentUserId = "" } = req.query;

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { githubLink: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    let projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .populate("owner", "name username")
      .populate("ratings.user", "name username")
      .populate("comments.user", "name username");

    let currentUser = null;
    if (currentUserId) {
      currentUser = {
        _id: currentUserId,
      };
    }

    let followingSet = new Set();

    if (currentUserId) {
      const dbUser = await User.findById(currentUserId);
      if (dbUser) {
        followingSet = new Set(dbUser.following.map((id) => id.toString()));
      }
    }

    if (scope === "following" && currentUserId) {
      const dbUser = await User.findById(currentUserId);
      if (!dbUser) {
        return res.json({ projects: [] });
      }
      const visibleOwnerIds = new Set([currentUserId, ...dbUser.following.map((id) => id.toString())]);
      projects = projects.filter((project) => visibleOwnerIds.has(project.owner._id.toString()));
    }

    return res.json({
      projects: projects.map((project) => mapProject(project, currentUser, followingSet)),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch projects." });
  }
});

router.post("/", auth, async (req, res) => {
  try {
    const { name, githubLink, description } = req.body;

    if (!name || !githubLink || !description) {
      return res.status(400).json({ message: "Project name, GitHub link, and description are required." });
    }

    const project = await Project.create({
      owner: req.user._id,
      name: name.trim(),
      githubLink: githubLink.trim(),
      description: description.trim(),
    });

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name username")
      .populate("ratings.user", "name username")
      .populate("comments.user", "name username");

    return res.status(201).json({
      project: mapProject(
        populatedProject,
        req.user,
        new Set(req.user.following.map((id) => id.toString()))
      ),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to upload project." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner", "name username")
      .populate("ratings.user", "name username")
      .populate("comments.user", "name username");

    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const currentUserId = req.query.currentUserId || "";
    const currentUser = currentUserId ? { _id: currentUserId } : null;
    let followingSet = new Set();
    if (currentUserId) {
      const dbUser = await User.findById(currentUserId);
      if (dbUser) {
        followingSet = new Set(dbUser.following.map((id) => id.toString()));
      }
    }

    return res.json({
      project: mapProject(project, currentUser, followingSet),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch project." });
  }
});

router.post("/:id/comments", auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Comment text is required." });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    project.comments.push({
      user: req.user._id,
      text: text.trim(),
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name username")
      .populate("ratings.user", "name username")
      .populate("comments.user", "name username");

    return res.status(201).json({
      project: mapProject(
        populatedProject,
        req.user,
        new Set(req.user.following.map((id) => id.toString()))
      ),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add comment." });
  }
});

router.post("/:id/rating", auth, async (req, res) => {
  try {
    const value = Number(req.body.value);

    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return res.status(400).json({ message: "Rating must be a whole number from 1 to 5." });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }

    const existingRating = project.ratings.find((rating) => rating.user.toString() === req.user._id.toString());
    if (existingRating) {
      existingRating.value = value;
    } else {
      project.ratings.push({
        user: req.user._id,
        value,
      });
    }

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name username")
      .populate("ratings.user", "name username")
      .populate("comments.user", "name username");

    return res.json({
      project: mapProject(
        populatedProject,
        req.user,
        new Set(req.user.following.map((id) => id.toString()))
      ),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save rating." });
  }
});

module.exports = router;
