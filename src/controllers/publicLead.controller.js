const Lead = require("../models/lead.model");

const normalizeText = (value = "") => String(value).trim();

const isValidEmail = (email = "") => /^\S+@\S+\.\S+$/.test(email);

const parseFutureOrTodayDate = (value) => {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const candidate = new Date(date);
    candidate.setHours(0, 0, 0, 0);

    if (candidate < today) return null;

    return date;
};

const createFreeConsultationLead = async (req, res, next) => {
    try {
        const {
            name,
            email,
            phone,
            countryInterest,
            studyLevel,
            intake,
            budgetRange,
            notes,
        } = req.body;

        if (!name || !email || !phone || !countryInterest) {
            return res.status(400).json({
                success: false,
                message: "Name, email, phone, and country of interest are required",
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
            });
        }

        const lead = await Lead.create({
            name: normalizeText(name),
            email: normalizeText(email).toLowerCase(),
            phone: normalizeText(phone),
            countryInterest: normalizeText(countryInterest),
            studyLevel: normalizeText(studyLevel),
            intake: normalizeText(intake),
            budgetRange: normalizeText(budgetRange),
            notes: normalizeText(notes),
            source: "free_consultation",
            inquiryType: "free_consultation",
            status: "new",
            createdBy: null,
        });

        return res.status(201).json({
            success: true,
            message: "Free consultation request submitted successfully",
            leadId: lead._id,
        });
    } catch (error) {
        next(error);
    }
};

const createBookConsultationLead = async (req, res, next) => {
    try {
        const {
            name,
            email,
            phone,
            countryInterest,
            studyLevel,
            intake,
            notes,
            preferredConsultationDate,
            preferredConsultationTime,
            consultationMode,
        } = req.body;

        if (!name || !email || !phone || !countryInterest) {
            return res.status(400).json({
                success: false,
                message: "Name, email, phone, and country of interest are required",
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address",
            });
        }

        const safeDate = parseFutureOrTodayDate(preferredConsultationDate);
        if (!safeDate) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid consultation date",
            });
        }

        if (!normalizeText(preferredConsultationTime)) {
            return res.status(400).json({
                success: false,
                message: "Preferred consultation time is required",
            });
        }

        if (!["online", "in_person", "phone"].includes(consultationMode)) {
            return res.status(400).json({
                success: false,
                message: "Invalid consultation mode",
            });
        }

        const lead = await Lead.create({
            name: normalizeText(name),
            email: normalizeText(email).toLowerCase(),
            phone: normalizeText(phone),
            countryInterest: normalizeText(countryInterest),
            studyLevel: normalizeText(studyLevel),
            intake: normalizeText(intake),
            notes: normalizeText(notes),
            source: "book_consultation",
            inquiryType: "book_consultation",
            status: "pending_confirmation",
            preferredConsultationDate: safeDate,
            preferredConsultationTime: normalizeText(preferredConsultationTime),
            consultationMode,
            createdBy: null,
        });

        return res.status(201).json({
            success: true,
            message: "Consultation booking request submitted successfully",
            leadId: lead._id,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createFreeConsultationLead,
    createBookConsultationLead,
};