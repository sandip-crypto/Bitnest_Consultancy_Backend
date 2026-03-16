const mongoose = require("mongoose");

const contactInquirySchema = new mongoose.Schema(
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
            trim: true,
            default: "",
            maxlength: 30,
        },
        destinations: [
            {
                type: String,
                trim: true,
                maxlength: 80,
            }
        ],
        message: {
            type: String,
            trim: true,
            required: [true, "Message is required"],
            minlength: 5,
            maxlength: 5000,
        },
        source: {
            type: String,
            trim: true,
            default: "contact_form",
            index: true,
        },
        status: {
            type: String,
            enum: ["new", "reviewed", "converted", "closed", "spam"],
            default: "new",
            index: true,
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        assignedToName: {
            type: String,
            trim: true,
            default: "",
        },
        internalNotes: {
            type: String,
            trim: true,
            default: "",
            maxlength: 5000,
        },
        convertedLeadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lead",
            default: null,
            index: true,
        },
        convertedAt: {
            type: Date,
            default: null,
        },
        ipAddress: {
            type: String,
            trim: true,
            default: "",
        },
        userAgent: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

// Full-text search for admin search bar
contactInquirySchema.index({
    name: "text",
    email: "text",
    message: "text",
});

// Compound indexes for common admin queries
contactInquirySchema.index({ status: 1, createdAt: -1 });
contactInquirySchema.index({ destination: 1, createdAt: -1 });
contactInquirySchema.index({ source: 1, createdAt: -1 });
contactInquirySchema.index({ assignedTo: 1, createdAt: -1 });
contactInquirySchema.index({ convertedLeadId: 1 });

module.exports = mongoose.model("ContactInquiry", contactInquirySchema);