
const express = require("express");
const router = express.Router();

const Comment = require("../models/Comment");
const Issue = require("../models/Issue");
const protect = require("../middleware/authMiddleware");

// Get all comments for one issue
router.get("/:issueId", protect, async (req, res) => {
    try {
        const issue = await Issue.findById(req.params.issueId);

        if (!issue) {
            return res.status(404).json({
                message: "Issue not found"
            });
        }

        const isReporter =
            issue.reportedBy.toString() === req.user.id;

        const isAssignedStaff =
            issue.assignedTo &&
            issue.assignedTo.toString() === req.user.id;

        const isStaffOrAdmin =
            req.user.role === "staff" ||
            req.user.role === "admin";

        if (!isReporter && !isAssignedStaff && !isStaffOrAdmin) {
            return res.status(403).json({
                message: "You cannot view comments for this issue"
            });
        }

        const comments = await Comment.find({
            issue: issue._id
        })
            .populate("user", "name role")
            .sort({ createdAt: 1 });

        return res.status(200).json({ comments });
    } catch (error) {
        console.error("Get comments error:", error);

        return res.status(500).json({
            message: "Failed to fetch comments"
        });
    }
});

// Add a comment to an issue
router.post("/:issueId", protect, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({
                message: "Comment text is required"
            });
        }

        const issue = await Issue.findById(req.params.issueId);

        if (!issue) {
            return res.status(404).json({
                message: "Issue not found"
            });
        }

        const isReporter =
            issue.reportedBy.toString() === req.user.id;

        const isAssignedStaff =
            issue.assignedTo &&
            issue.assignedTo.toString() === req.user.id;

        const isStaffOrAdmin =
            req.user.role === "staff" ||
            req.user.role === "admin";

        if (!isReporter && !isAssignedStaff && !isStaffOrAdmin) {
            return res.status(403).json({
                message: "You cannot comment on this issue"
            });
        }

        const comment = await Comment.create({
            issue: issue._id,
            user: req.user.id,
            text: text.trim()
        });

        await comment.populate("user", "name role");

        return res.status(201).json({
            message: "Comment added successfully",
            comment
        });
    } catch (error) {
        console.error("Add comment error:", error);

        return res.status(500).json({
            message: "Failed to add comment"
        });
    }
});

module.exports = router; 