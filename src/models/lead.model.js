const mongoose = require("mongoose");

const LEAD_STATUSES = [
    "new",
    "contacted",
    "qualified",
    "converted",
    "lost",
    "pending_confirmation",
    "confirmed",
    "completed",
    "cancelled",
];

const LEAD_SOURCES = [
    "website",
    "manual",
    "contact_form",
    "free_consultation",
    "book_consultation",
];

const LEAD_INQUIRY_TYPES = [
    "lead",
    "free_consultation",
    "book_consultation",
];

const CONSULTATION_MODES = ["", "online", "in_person", "phone"];

const leadSchema = new mongoose.Schema(
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

        countryInterest: {
            type: [String],
            required: [true, "Country of interest is required"],
            default: [],
        },

        studyLevel: {
            type: String,
            trim: true,
            enum: ["", "Diploma", "Bachelor", "Postgraduate Diploma", "Master", "PhD", "Other"],
            default: "",
        },

        intake: {
            type: String,
            trim: true,
            maxlength: 60,
            default: "",
        },

        budgetRange: {
            type: String,
            trim: true,
            maxlength: 100,
            default: "",
        },

        inquiryType: {
            type: String,
            enum: LEAD_INQUIRY_TYPES,
            default: "lead",
            index: true,
        },

        status: {
            type: String,
            enum: LEAD_STATUSES,
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

        notes: {
            type: String,
            trim: true,
            default: "",
            maxlength: 5000,
        },

        source: {
            type: String,
            enum: LEAD_SOURCES,
            default: "website",
            index: true,
        },

        preferredConsultationDate: {
            type: Date,
            default: null,
            index: true,
        },

        preferredConsultationTime: {
            type: String,
            trim: true,
            default: "",
            maxlength: 50,
        },

        consultationMode: {
            type: String,
            enum: CONSULTATION_MODES,
            default: "",
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

leadSchema.index({
    name: "text",
    email: "text",
    phone: "text",
    countryInterest: "text",
    notes: "text",
});

leadSchema.index({
    status: 1,
    inquiryType: 1,
    source: 1,
    countryInterest: 1,
    createdAt: -1,
});

module.exports = mongoose.model("Lead", leadSchema);