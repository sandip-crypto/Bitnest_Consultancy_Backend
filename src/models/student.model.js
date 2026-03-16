const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: 2,
            maxlength: 100,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
            index: true,
        },
        phone: {
            type: String,
            required: [true, "Phone is required"],
            trim: true,
            maxlength: 30,
        },
        countries: {
            type: [String],
            default: [],
        },
        counselor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        counselorName: {
            type: String,
            trim: true,
            default: "",
        },
        notes: {
            type: String,
            trim: true,
            default: "",
            maxlength: 5000,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

studentSchema.index({ name: "text", email: "text", phone: "text" });

module.exports = mongoose.model("Student", studentSchema);