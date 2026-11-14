const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");

const Issue = require("../models/Issue");
const Comment = require("../models/Comment");
const User = require("../models/User");
const Notification = require("../models/Notification");
const IssueActivity = require("../models/IssueActivity");

const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { analyzeIssue } = require("../services/issueAnalysis");

const router = express.Router();

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

const isStaffOrAdmin = (user) =>
    user.role === "staff" || user.role === "admin";

const escapeRegex = (value = "") =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// --------------------------------------------------
// FIND RELATED ISSUES
// --------------------------------------------------

const findRelatedIssues = async (
    title,
    description,
    location,
    category
) => {
    try {
        const words = [...new Set(
            `${title} ${description}`
                .toLowerCase()
                .split(/\s+/)
                .map(word => word.replace(/[^a-z0-9]/g, ""))
                .filter(word => word.length >= 4)
        )];

        if (!words.length) {
            return [];
        }

        const searchConditions = words.map(word => ({
            $or: [
                {
                    title: {
                        $regex: escapeRegex(word),
                        $options: "i"
                    }
                },
                {
                    description: {
                        $regex: escapeRegex(word),
                        $options: "i"
                    }
                }
            ]
        }));

        return await Issue.find({
            location: {
                $regex: `^${escapeRegex(location.trim())}$`,
                $options: "i"
            },
            category,
            $or: searchConditions
        })
            .sort({ createdAt: -1 })
            .limit(5)
            .select(
                "title description location category priority status createdAt"
            );

    } catch (error) {
        console.error(
            "Related issue detection error:",
            error.message
        );
        return [];
    }
};

// --------------------------------------------------
// CREATE ISSUE
// --------------------------------------------------

router.post(
    "/",
    protect,
    (req, res, next) => {
        upload.single("image")(req, res, (error) => {
            if (error) {
                if (error instanceof multer.MulterError) {
                    if (error.code === "LIMIT_FILE_SIZE") {
                        return res.status(400).json({
                            message: "Image must be 5 MB or smaller."
                        });
                    }

                    if (error.code === "LIMIT_UNEXPECTED_FILE") {
                        return res.status(400).json({
                            message: "Only one image can be uploaded."
                        });
                    }

                    return res.status(400).json({
                        message: "Invalid image upload."
                    });
                }

                return res.status(400).json({
                    message: error.message || "Image upload failed."
                });
            }

            next();
        });
    },
    async (req, res) => {
        try {
            const { title, description, location } = req.body;

            const MAX_TITLE_LENGTH = 120;
            const MAX_DESCRIPTION_LENGTH = 2000;
            const MAX_LOCATION_LENGTH = 100;

            if (
                typeof title !== "string" ||
                !title.trim() ||
                title.trim().length > MAX_TITLE_LENGTH ||

                typeof description !== "string" ||
                !description.trim() ||
                description.trim().length > MAX_DESCRIPTION_LENGTH ||

                typeof location !== "string" ||
                !location.trim() ||
                location.trim().length > MAX_LOCATION_LENGTH
            ) {
                return res.status(400).json({
                    message:
                        "Title (max 120 characters), description (max 2000 characters), and location (max 100 characters) are required and must be within their length limits."
                });
            }

            const {
                category,
                department,
                priority,
                summary: aiSummary,
                aiSource
            } = await analyzeIssue(title, description);

            const relatedIssues = await findRelatedIssues(
                title,
                description,
                location,
                category
            );

            const issue = await Issue.create({
                title: title.trim(),
                description: description.trim(),
                location: location.trim(),
                department,
                category,
                priority,
                aiSummary,
                aiSource,
                imageUrl: req.file
                    ? `/uploads/${req.file.filename}`
                    : "",
                reportedBy: req.user.id
            });

            await IssueActivity.create({
                issue: issue._id,
                user: req.user.id,
                action: "created",
                details: `Issue "${issue.title}" was reported.`,
                newValue: issue.status || "Pending"
            });

            return res.status(201).json({
                message: "Issue created successfully",
                issue,
                relatedIssues
            });

        } catch (error) {
            console.error("Create issue error:", error);

            return res.status(500).json({
                message: "Server error"
            });
        }
    }
);

// --------------------------------------------------
// GET MY ISSUES
// --------------------------------------------------

router.get("/my", protect, async (req, res) => {
    try {
        const issues = await Issue.find({
            reportedBy: req.user.id
        }).sort({ createdAt: -1 });

        return res.status(200).json({ issues });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server error"
        });
    }
});

// --------------------------------------------------
// SEARCH AND FILTER ISSUES
// --------------------------------------------------

router.get("/search", protect, async (req, res) => {
    try {
        const {
            q,
            status,
            priority,
            category,
            department,
            location,
            page = 1,
            limit = 10
        } = req.query;

        const query = {};

        if (q) {
            const safeQ = escapeRegex(String(q));

            query.$or = [
                {
                    title: {
                        $regex: safeQ,
                        $options: "i"
                    }
                },
                {
                    description: {
                        $regex: safeQ,
                        $options: "i"
                    }
                },
                {
                    location: {
                        $regex: safeQ,
                        $options: "i"
                    }
                }
            ];
        }

        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (category) query.category = category;
        if (department) query.department = department;

        if (location) {
            query.location = {
                $regex: escapeRegex(String(location)),
                $options: "i"
            };
        }

        if (req.user.role === "student") {
            query.reportedBy = req.user.id;
        } else if (!isStaffOrAdmin(req.user)) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        const pageNumber = Math.max(
            1,
            parseInt(page, 10) || 1
        );

        const pageSize = Math.min(
            100,
            Math.max(1, parseInt(limit, 10) || 10)
        );

        const skip = (pageNumber - 1) * pageSize;

        const [issues, total] = await Promise.all([
            Issue.find(query)
                .populate("reportedBy", "name email")
                .populate("assignedTo", "name email department")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize),

            Issue.countDocuments(query)
        ]);

        return res.status(200).json({
            issues,
            pagination: {
                total,
                page: pageNumber,
                limit: pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server error"
        });
    }
});

// --------------------------------------------------
// GET ISSUES
// --------------------------------------------------

router.get("/", protect, async (req, res) => {
    try {
        const query = {};

        if (req.user.role === "student") {
            query.reportedBy = req.user.id;

        } else if (!isStaffOrAdmin(req.user)) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        const issues = await Issue.find(query)
            .populate("reportedBy", "name email")
            .populate("assignedTo", "name email department")
            .sort({ createdAt: -1 });

        return res.status(200).json({ issues });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server error"
        });
    }
});

// --------------------------------------------------
// GET ALL ISSUES - STAFF/ADMIN ONLY
// --------------------------------------------------

router.get("/all", protect, async (req, res) => {
    try {
        if (!isStaffOrAdmin(req.user)) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        const issues = await Issue.find()
            .populate("reportedBy", "name email")
            .populate("assignedTo", "name email department")
            .sort({ createdAt: -1 });

        return res.status(200).json({ issues });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server error"
        });
    }
});

// --------------------------------------------------
// UPDATE ISSUE STATUS
// --------------------------------------------------

router.patch("/:id/status", protect, async (req, res) => {
    if (!isStaffOrAdmin(req.user)) {
        return res.status(403).json({
            message: "Only staff or admin can update issue status"
        });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
            message: "Invalid issue ID"
        });
    }

    try {
        const { status, resolutionNote } = req.body;

        const allowedStatuses = [
            "Pending",
            "In Progress",
            "Resolved",
            "Closed"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        if (
            status === "Resolved" &&
            (
                typeof resolutionNote !== "string" ||
                !resolutionNote.trim() ||
                resolutionNote.trim().length > 1000
            )
        ) {
            return res.status(400).json({
                message:
                    "A resolution note is required and must not exceed 1000 characters."
            });
        }

        const issue = await Issue.findById(req.params.id);

        if (!issue) {
            return res.status(404).json({
                message: "Issue not found"
            });
        }

        const previousStatus = issue.status;

        // Prevent duplicate activity records.
        if (previousStatus === status) {
            return res.status(200).json({
                message: "Issue already has this status",
                issue
            });
        }

        issue.status = status;

        if (status === "Resolved") {
            issue.resolutionNote = resolutionNote.trim();
        }

        await issue.save();

        await IssueActivity.create({
            issue: issue._id,
            user: req.user.id,
            action: "status_changed",
            details:
                status === "Resolved"
                    ? `Issue "${issue.title}" was resolved.`
                    : `Status changed from ${previousStatus} to ${status}.`,
            previousValue: previousStatus,
            newValue: status
        });

        await Notification.create({
            user: issue.reportedBy,
            message: `Your issue "${issue.title}" is now ${status}.`,
            type: status === "Resolved" ? "resolution" : "status",
            issue: issue._id
        });

        return res.status(200).json({
            message: "Status updated successfully",
            issue
        });

    } catch (error) {
        console.error("Update issue status error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
});

// --------------------------------------------------
// GET STAFF MEMBERS
// --------------------------------------------------

router.get("/staff", protect, async (req, res) => {
    if (!isStaffOrAdmin(req.user)) {
        return res.status(403).json({
            message: "Only staff or admin can view staff members"
        });
    }

    try {
        const staff = await User.find(
            { role: "staff" },
            "name email department"
        );

        return res.status(200).json({ staff });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Server error"
        });
    }
});

// --------------------------------------------------
// ASSIGN ISSUE TO STAFF
// --------------------------------------------------

router.patch("/:id/assign", protect, async (req, res) => {
    if (!isStaffOrAdmin(req.user)) {
        return res.status(403).json({
            message: "Only staff or admin can assign issues"
        });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
            message: "Invalid issue ID"
        });
    }

    try {
        const { staffId } = req.body;

        if (!staffId || !mongoose.isValidObjectId(staffId)) {
            return res.status(400).json({
                message: "A valid staff ID is required"
            });
        }

        const staff = await User.findOne({
            _id: staffId,
            role: "staff"
        });

        if (!staff) {
            return res.status(404).json({
                message: "Staff member not found"
            });
        }

        const issue = await Issue.findById(req.params.id);

        if (!issue) {
            return res.status(404).json({
                message: "Issue not found"
            });
        }

        const previousAssignee = issue.assignedTo
            ? issue.assignedTo.toString()
            : null;

        const newAssignee = staff._id.toString();

        // Prevent duplicate assignment activity and notifications.
        if (previousAssignee === newAssignee) {
            await issue.populate(
                "assignedTo",
                "name email department"
            );

            return res.status(200).json({
                message: "Issue is already assigned to this staff member",
                issue
            });
        }

        issue.assignedTo = staff._id;
        await issue.save();

        await IssueActivity.create({
            issue: issue._id,
            user: req.user.id,
            action: "assigned",
            details: `Issue "${issue.title}" was assigned to ${staff.name}.`,
            previousValue: previousAssignee || "",
            newValue: newAssignee
        });

        // Only one notification is created.
        await Notification.create({
            user: staff._id,
            message: `You have been assigned issue "${issue.title}".`,
            type: "assignment",
            issue: issue._id
        });

        await issue.populate(
            "assignedTo",
            "name email department"
        );

        return res.status(200).json({
            message: "Issue assigned successfully",
            issue
        });

    } catch (error) {
        console.error("Assign issue error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
});

// --------------------------------------------------
// ADD COMMENT TO ISSUE
// --------------------------------------------------

router.post("/:id/comments", protect, async (req, res) => {
    try {
        const { text } = req.body;

        if (
            typeof text !== "string" ||
            !text.trim() ||
            text.trim().length > 1000
        ) {
            return res.status(400).json({
                message:
                    "Comment must contain text and cannot exceed 1000 characters."
            });
        }

        if (!["student", "staff", "admin"].includes(req.user.role)) {
            return res.status(403).json({
                message: "You are not allowed to comment"
            });
        }

        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid issue ID"
            });
        }

        const issue = await Issue.findById(req.params.id);

        if (!issue) {
            return res.status(404).json({
                message: "Issue not found"
            });
        }

        if (
            req.user.role === "student" &&
            issue.reportedBy.toString() !== req.user.id.toString()
        ) {
            return res.status(403).json({
                message: "You can comment only on your own issues"
            });
        }

        const comment = await Comment.create({
            issue: issue._id,
            user: req.user.id,
            text: text.trim()
        });

        await IssueActivity.create({
            issue: issue._id,
            user: req.user.id,
            action: "comment_added",
            details: "A comment was added to this issue."
        });

        const populatedComment = await Comment.findById(comment._id)
            .populate("user", "name email role");

        const recipients = new Set();

        if (req.user.role === "student") {
            if (issue.assignedTo) {
                recipients.add(issue.assignedTo.toString());
            }
        } else {
            recipients.add(issue.reportedBy.toString());
        }

        recipients.delete(req.user.id.toString());

        if (recipients.size > 0) {
            await Notification.insertMany(
                [...recipients].map(userId => ({
                    user: userId,
                    message: `New comment on issue "${issue.title}".`,
                    type: "comment",
                    issue: issue._id
                }))
            );
        }

        return res.status(201).json({
            message: "Comment added successfully",
            comment: populatedComment
        });

    } catch (error) {
        console.error("Add comment error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
});

// --------------------------------------------------
// GET COMMENTS FOR ISSUE
// --------------------------------------------------

router.get("/:id/comments", protect, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid issue ID"
            });
        }

        const issue = await Issue.findById(req.params.id);

        if (!issue) {
            return res.status(404).json({
                message: "Issue not found"
            });
        }

        if (
            req.user.role === "student" &&
            issue.reportedBy.toString() !== req.user.id.toString()
        ) {
            return res.status(403).json({
                message: "You can view comments only on your own issues"
            });
        }

        if (!["student", "staff", "admin"].includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        const comments = await Comment.find({
            issue: issue._id
        })
            .populate("user", "name email role")
            .sort({ createdAt: 1 });

        return res.status(200).json({ comments });

    } catch (error) {
        console.error("Get comments error:", error);

        return res.status(500).json({
            message: "Server error"
        });
    }
});

// --------------------------------------------------
// GET RECENT CAMPUS ACTIVITY - STAFF/ADMIN ONLY
// Keep this BEFORE /:id/activity
// --------------------------------------------------

router.get("/activity/recent", protect, async (req, res) => {
    try {
        if (!isStaffOrAdmin(req.user)) {
            return res.status(403).json({
                message: "Only staff or admin can view campus activity"
            });
        }

        const limit = Math.min(
            50,
            Math.max(1, parseInt(req.query.limit, 10) || 10)
        );

        const activities = await IssueActivity.find()
            .populate("user", "name role")
            .populate("issue", "title status category priority")
            .sort({ createdAt: -1 })
            .limit(limit);

        return res.status(200).json({
            activities
        });

    } catch (error) {
        console.error(
            "Fetch recent campus activity error:",
            error
        );

        return res.status(500).json({
            message: "Failed to fetch recent campus activity"
        });
    }
});

// --------------------------------------------------
// GET ACTIVITY HISTORY FOR A SPECIFIC ISSUE
// --------------------------------------------------

router.get("/:id/activity", protect, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid issue ID"
            });
        }

        const issue = await Issue.findById(id);

        if (!issue) {
            return res.status(404).json({
                message: "Issue not found"
            });
        }

        // Students can view activity only for their own issues.
        // Staff and admins can view activity for any issue.
        if (
            req.user.role === "student" &&
            issue.reportedBy.toString() !== req.user.id.toString()
        ) {
            return res.status(403).json({
                message: "You are not authorized to view this activity"
            });
        }

        if (!["student", "staff", "admin"].includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        const activities = await IssueActivity.find({
            issue: id
        })
            .populate("user", "name role")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            activities
        });

    } catch (error) {
        console.error(
            "Fetch issue activity error:",
            error
        );

        return res.status(500).json({
            message: "Failed to fetch issue activity"
        });
    }
});

// --------------------------------------------------
// EXPORT ROUTER
// --------------------------------------------------

module.exports = router; 