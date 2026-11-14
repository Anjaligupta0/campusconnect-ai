const mongoose = require("mongoose");

const issueActivitySchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      enum: [
        "created",
        "status_changed",
        "assigned",
        "comment_added",
        "resolution_added",
      ],
      required: true,
    },

    details: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    previousValue: {
      type: String,
      default: "",
    },

    newValue: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

issueActivitySchema.index({ issue: 1, createdAt: -1 });

module.exports = mongoose.model("IssueActivity", issueActivitySchema); 