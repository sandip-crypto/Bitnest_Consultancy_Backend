const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
    {
        question: {
            type: String,
            required: [true, "Question is required"],
            trim: true,
            minlength: [5, "Question must be at least 5 characters"],
            maxlength: [200, "Question cannot exceed 200 characters"],
        },
        answer: {
            type: String,
            required: [true, "Answer is required"],
            trim: true,
            minlength: [5, "Answer must be at least 5 characters"],
            maxlength: [3000, "Answer cannot exceed 3000 characters"],
        },
        category: {
            type: String,
            trim: true,
            default: "General",
            maxlength: [80, "Category cannot exceed 80 characters"],
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        order: {
            type: Number,
            default: 0,
            min: [0, "Order cannot be negative"],
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        featured: {
            type: Boolean,
            default: false,
            index: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

faqSchema.index({ category: 1, isActive: 1, order: 1 });
faqSchema.index({ question: "text", answer: "text", category: "text" });

module.exports = mongoose.model("FAQ", faqSchema);