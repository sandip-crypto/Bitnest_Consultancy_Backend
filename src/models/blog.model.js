const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            minlength: 5,
            maxlength: 180,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        excerpt: {
            type: String,
            required: [true, "Excerpt is required"],
            trim: true,
            minlength: 20,
            maxlength: 320,
        },
        content: {
            type: String,
            required: [true, "Content is required"],
            minlength: 50,
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
            maxlength: 60,
        },
        readTime: {
            type: String,
            trim: true,
            default: "5 min",
        },
        coverImage: {
            type: String,
            trim: true,
            default: "",
        },
        coverImageAlt: {
            type: String,
            trim: true,
            default: "",
            maxlength: 150,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        authorName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },
        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
            index: true,
        },
        featured: {
            type: Boolean,
            default: false,
            index: true,
        },
        publishedAt: {
            type: Date,
            default: null,
            index: true,
        },
        views: {
            type: Number,
            default: 0,
            min: 0,
        },
        seoTitle: {
            type: String,
            trim: true,
            maxlength: 180,
            default: "",
        },
        seoDescription: {
            type: String,
            trim: true,
            maxlength: 320,
            default: "",
        },
        tags: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

blogSchema.index({ title: "text", excerpt: "text", content: "text", category: "text" });
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ featured: 1, publishedAt: -1 });

module.exports = mongoose.model("Blog", blogSchema);