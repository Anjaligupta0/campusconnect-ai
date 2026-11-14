
const express = require("express");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Get current user's notifications
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      user: req.user.id,
    })
      .populate("issue", "title status")
      .sort({ createdAt: -1 });

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Mark one notification as read
router.patch("/:id/read", protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the notification ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid notification ID",
      });
    }

    // Update only if the notification belongs to this user
    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        user: req.user.id,
      },
      {
        $set: { isRead: true },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;
