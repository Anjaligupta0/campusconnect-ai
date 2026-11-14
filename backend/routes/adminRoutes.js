const express = require("express");

const Issue = require("../models/Issue");
const User = require("../models/User");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// ==========================================
// ADMIN ANALYTICS
// ==========================================

router.get("/analytics", protect, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Only admin can view analytics"
            });
        }

        const countBy = (field) => [
            { $group: { _id: `$${field}`, count: { $sum: 1 } } }
        ];

        const [issueFacets, userCounts] = await Promise.all([
            Issue.aggregate([
                {
                    $facet: {
                        total: [{ $count: "count" }],
                        status: countBy("status"),
                        category: countBy("category"),
                        priority: countBy("priority"),
                        avgResolutionHours: [
                            {
                                $match: {
                                    status: { $in: ["Resolved", "Closed"] }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    avgMs: {
                                        $avg: {
                                            $subtract: [
                                                "$updatedAt",
                                                "$createdAt"
                                            ]
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            ]),
            User.aggregate([
                { $group: { _id: "$role", count: { $sum: 1 } } }
            ])
        ]);

        const facets = issueFacets[0];

        const toMap = (rows, defaults) =>
            rows.reduce(
                (acc, row) => ({ ...acc, [row._id]: row.count }),
                { ...defaults }
            );

        const status = toMap(facets.status, {
            "Pending": 0, "In Progress": 0, "Resolved": 0, "Closed": 0
        });
        const users = toMap(userCounts, { student: 0, staff: 0, admin: 0 });
        const avgMs = facets.avgResolutionHours[0]?.avgMs;

        res.status(200).json({
            analytics: {
                issues: {
                    total: facets.total[0]?.count || 0,
                    pending: status["Pending"],
                    inProgress: status["In Progress"],
                    resolved: status["Resolved"],
                    closed: status["Closed"]
                },
                categories: toMap(facets.category, {
                    IT: 0, Maintenance: 0, Library: 0, Hostel: 0, Other: 0
                }),
                priorities: toMap(facets.priority, {
                    Low: 0, Medium: 0, High: 0, Urgent: 0
                }),
                users: {
                    students: users.student,
                    staff: users.staff
                },
                avgResolutionHours: avgMs
                    ? Math.round((avgMs / 36e5) * 10) / 10
                    : null
            }
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

// ==========================================
// GET ALL USERS
// ==========================================

router.get("/users", protect, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Only admin can view users"
            });
        }

        const users = await User.find()
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json({
            users
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

// ==========================================
// UPDATE USER ROLE
// ==========================================

router.patch("/users/:id/role", protect, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({
                message: "Only admin can update user roles"
            });
        }

        const { role } = req.body;

        const allowedRoles = [
            "student",
            "staff",
            "admin"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                message: "Invalid role"
            });
        }

        // Prevent admin from changing their own role
        if (req.user.id === req.params.id) {
            return res.status(400).json({
                message: "You cannot change your own admin role"
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Prevent removing the last administrator.
        if (user.role === "admin" && role !== "admin") {
            const adminCount = await User.countDocuments({
                role: "admin"
            });

            if (adminCount <= 1) {
                return res.status(400).json({
                    message: "Cannot remove the last administrator."
                });
            }
        }

        user.role = role;
        await user.save();

        res.status(200).json({
            message: "User role updated successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department
            }
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            message: "Server error"
        });
    }
});

module.exports = router; 