const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            required: true,
            trim: true
        },

        category: {
            type: String,
            default: "Other"
        },
        department: {
        type: String,
        default: "General",
},
        priority: {
            type: String,
            enum: ["Low", "Medium", "High", "Urgent"],
            default: "Medium"
        },

        location: {
            type: String,
            required: true,
            trim: true 
        },
        imageUrl: {
    type: String,
    default: ""
},

        status: {
            type: String,
            enum: ["Pending", "In Progress", "Resolved", "Closed"],
            default: "Pending"
        },

        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        aiSummary: {
            type: String,
            default: ""
        },
        aiSource: {
            type: String,
            enum: ["ai", "rules"],
            default: "rules"
        },
        resolutionNote: {
             type: String,
            default: ""
        }
    }, 
    {
        timestamps: true
    }
);

const Issue = mongoose.model("Issue", issueSchema);

module.exports = Issue; 