const mongoose = require("mongoose");

const studentPushTokenSchema = new mongoose.Schema(
  {
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Library",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    expoPushToken: { type: String, required: true, trim: true, maxlength: 512 },
    platform: { type: String, default: null, trim: true, maxlength: 32 },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, strict: true }
);

studentPushTokenSchema.index({ studentId: 1, expoPushToken: 1 }, { unique: true });

module.exports = mongoose.model("StudentPushToken", studentPushTokenSchema);
