const Lead = require("../models/lead.model");
const User = require("../models/user.model");

const VALID_STATUSES = [
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

const VALID_SOURCES = [
    "website",
    "manual",
    "contact_conversion",
    "free_consultation",
    "book_consultation",
];

const VALID_INQUIRY_TYPES = [
    "lead",
    "free_consultation",
    "book_consultation",
];

const VALID_CONSULTATION_MODES = ["", "online", "in_person", "phone"];

const normalizeText = (value = "") => String(value).trim();

const normalizeNullableText = (value = "") => {
    const result = String(value || "").trim();
    return result;
};

const normalizeDateOrNull = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const createLead = async (req, res, next) => {
    try {
        const {
            name,
            email,
            phone,
            studyLevel,
            intake,
            budgetRange,
            inquiryType,
            status,
            assignedTo,
            notes,
            source,
            preferredConsultationDate,
            preferredConsultationTime,
            consultationMode,
        } = req.body;

        let { countryInterest } = req.body;

        if (!name || !email || !phone || !countryInterest?.length) {
            return res.status(400).json({
                success: false,
                message: "Name, email, phone, and country are required",
            });
        }

        let assignedToName = "";

        if (assignedTo) {
            const assignedUser = await User.findById(assignedTo).select("username role status");
            if (!assignedUser) {
                return res.status(400).json({
                    success: false,
                    message: "Assigned user not found",
                });
            }
            assignedToName = assignedUser.username;
        }

        const safeInquiryType = VALID_INQUIRY_TYPES.includes(inquiryType)
            ? inquiryType
            : "lead";

        const safeSource = VALID_SOURCES.includes(source)
            ? source
            : "website";

        let safeStatus = VALID_STATUSES.includes(status)
            ? status
            : "new";

        if (safeInquiryType === "book_consultation" && !status) {
            safeStatus = "pending_confirmation";
        }

        const safeConsultationMode = VALID_CONSULTATION_MODES.includes(consultationMode)
            ? consultationMode
            : "";


        if (!Array.isArray(countryInterest)) {
            countryInterest = [];
        }

        countryInterest = countryInterest
            .map((c) => normalizeText(c))
            .filter(Boolean)
            .slice(0, 5);

        const lead = await Lead.create({
            name: normalizeText(name),
            email: normalizeText(email).toLowerCase(),
            phone: normalizeText(phone),
            countryInterest,
            studyLevel: normalizeNullableText(studyLevel),
            intake: normalizeNullableText(intake),
            budgetRange: normalizeNullableText(budgetRange),
            inquiryType: safeInquiryType,
            status: safeStatus,
            assignedTo: assignedTo || null,
            assignedToName,
            notes: normalizeText(notes),
            source: safeSource,
            preferredConsultationDate: normalizeDateOrNull(preferredConsultationDate),
            preferredConsultationTime: normalizeNullableText(preferredConsultationTime),
            consultationMode: safeConsultationMode,
            createdBy: req.user?._id || null,
        });

        return res.status(201).json({
            success: true,
            message: "Lead created successfully",
            lead,
        });
    } catch (error) {
        next(error);
    }
};

const getLeads = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const search = normalizeText(req.query.search || "");
        const country = normalizeText(req.query.country || "");
        const status = normalizeText(req.query.status || "");
        const source = normalizeText(req.query.source || "");
        const inquiryType = normalizeText(req.query.inquiryType || "");

        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
                { notes: { $regex: search, $options: "i" } },
            ];
        }

        if (country) {
            filter.countryInterest = { $regex: `^${country}$`, $options: "i" };
        }

        if (status && VALID_STATUSES.includes(status)) {
            filter.status = status;
        }

        if (source && VALID_SOURCES.includes(source)) {
            filter.source = source;
        }

        if (inquiryType && VALID_INQUIRY_TYPES.includes(inquiryType)) {
            filter.inquiryType = inquiryType;
        }

        const [leads, total] = await Promise.all([
            Lead.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Lead.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            leads,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getLeadById = async (req, res, next) => {
    try {
        const lead = await Lead.findById(req.params.id).lean();

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        return res.status(200).json({
            success: true,
            lead,
        });
    } catch (error) {
        next(error);
    }
};

const updateLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findById(id);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        const {
            name,
            email,
            phone,
            studyLevel,
            intake,
            budgetRange,
            inquiryType,
            status,
            assignedTo,
            notes,
            source,
            preferredConsultationDate,
            preferredConsultationTime,
            consultationMode,
            isActive,
        } = req.body;

        let { countryInterest } = req.body;

        if (!Array.isArray(countryInterest)) {
            countryInterest = [];
        }

        countryInterest = countryInterest
            .map((c) => normalizeText(c))
            .filter(Boolean)
            .slice(0, 5);

        lead.countryInterest = countryInterest;

        if (typeof name !== "undefined") lead.name = normalizeText(name);
        if (typeof email !== "undefined") lead.email = normalizeText(email).toLowerCase();
        if (typeof phone !== "undefined") lead.phone = normalizeText(phone);
        if (typeof studyLevel !== "undefined") lead.studyLevel = normalizeNullableText(studyLevel);
        if (typeof intake !== "undefined") lead.intake = normalizeNullableText(intake);
        if (typeof budgetRange !== "undefined") lead.budgetRange = normalizeNullableText(budgetRange);
        if (typeof notes !== "undefined") lead.notes = normalizeText(notes);

        if (typeof source !== "undefined") {
            if (!VALID_SOURCES.includes(source)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid lead source",
                });
            }
            lead.source = source;
        }

        if (typeof inquiryType !== "undefined") {
            if (!VALID_INQUIRY_TYPES.includes(inquiryType)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid inquiry type",
                });
            }
            lead.inquiryType = inquiryType;
        }

        if (typeof status !== "undefined") {
            if (!VALID_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid lead status",
                });
            }
            lead.status = status;
        }

        if (typeof consultationMode !== "undefined") {
            if (!VALID_CONSULTATION_MODES.includes(consultationMode)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid consultation mode",
                });
            }
            lead.consultationMode = consultationMode;
        }

        if (typeof preferredConsultationDate !== "undefined") {
            lead.preferredConsultationDate = normalizeDateOrNull(preferredConsultationDate);
        }

        if (typeof preferredConsultationTime !== "undefined") {
            lead.preferredConsultationTime = normalizeNullableText(preferredConsultationTime);
        }

        if (typeof isActive !== "undefined") {
            lead.isActive = Boolean(isActive);
        }

        if (typeof assignedTo !== "undefined") {
            if (!assignedTo) {
                lead.assignedTo = null;
                lead.assignedToName = "";
            } else {
                const assignedUser = await User.findById(assignedTo).select("username");
                if (!assignedUser) {
                    return res.status(400).json({
                        success: false,
                        message: "Assigned user not found",
                    });
                }
                lead.assignedTo = assignedTo;
                lead.assignedToName = assignedUser.username;
            }
        }

        await lead.save();

        return res.status(200).json({
            success: true,
            message: "Lead updated successfully",
            lead,
        });
    } catch (error) {
        next(error);
    }
};

const deleteLead = async (req, res, next) => {
    try {
        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found",
            });
        }

        await lead.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Lead deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createLead,
    getLeads,
    getLeadById,
    updateLead,
    deleteLead,
};