const ContactInquiry = require("../models/contactInquiry.model");
const Lead = require("../models/lead.model");
const User = require("../models/user.model");
const {
    sendInquiryNotificationToStaff,
    sendInquiryAutoReplyToUser,
} = require("../services/mail.service");
const logger = require("../utils/logger");

const normalizeText = (value = "") => String(value).trim();

const sanitizeBasicText = (value = "") =>
    String(value).replace(/\s+/g, " ").trim();

const getClientIp = (req) => {
    return (
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        ""
    );
};

// Public: submit contact form
const submitContactInquiry = async (req, res, next) => {
    try {

        let { name, email, phone, destinations, message } = req.body;

        name = sanitizeBasicText(name);
        email = sanitizeBasicText(email).toLowerCase();
        phone = sanitizeBasicText(phone);
        message = String(message || "").trim();

        if (!Array.isArray(destinations)) {
            destinations = [];
        }

        destinations = destinations
            .map((d) => sanitizeBasicText(d))
            .filter(Boolean)
            .slice(0, 5); // limit to 5 selections

        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and message are required",
            });
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address",
            });
        }

        const inquiry = await ContactInquiry.create({
            name,
            email,
            phone,
            destinations,
            message,
            source: "contact_form",
            status: "new",
            ipAddress: getClientIp(req),
            userAgent: req.get("user-agent") || "",
        });

        // Notification layer only — do not fail submission if email fails
        Promise.allSettled([
            sendInquiryNotificationToStaff(inquiry),
            sendInquiryAutoReplyToUser(inquiry),
        ])
            .then((results) => {
                results.forEach((result, index) => {
                    if (result.status === "rejected") {
                        logger.error(
                            `Contact inquiry email ${index === 0 ? "staff" : "user"} failed: ${result.reason?.message || result.reason}`
                        );
                    }
                });
            })
            .catch((err) => {
                logger.error(`Unexpected inquiry email error: ${err.message}`);
            });

        return res.status(201).json({
            success: true,
            message: "Your inquiry has been submitted successfully",
            inquiryId: inquiry._id,
        });
    } catch (error) {
        next(error);
    }
};

// JUST FOR TEMPORARY PURPOSE -> To test bulk insert, otherwise upper one is fine.
// const submitContactInquiry = async (req, res, next) => {
//     try {
//         const payload = Array.isArray(req.body) ? req.body : [req.body];

//         if (!payload.length) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Request body cannot be empty",
//             });
//         }

//         const sanitizedInquiries = payload.map((item = {}) => {
//             const name = sanitizeBasicText(item.name);
//             const email = sanitizeBasicText(item.email).toLowerCase();
//             const phone = sanitizeBasicText(item.phone);
//             const destination = sanitizeBasicText(item.destination);
//             const message = String(item.message || "").trim();

//             return {
//                 name,
//                 email,
//                 phone,
//                 destination,
//                 message,
//                 source: "contact_form",
//                 status: "new",
//                 ipAddress: getClientIp(req),
//                 userAgent: req.get("user-agent") || "",
//             };
//         });

//         for (const inquiry of sanitizedInquiries) {
//             if (!inquiry.name || !inquiry.email || !inquiry.message) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "Name, email, and message are required",
//                 });
//             }

//             if (!/^\S+@\S+\.\S+$/.test(inquiry.email)) {
//                 return res.status(400).json({
//                     success: false,
//                     message: `Please enter a valid email address for ${inquiry.name || "this inquiry"}`,
//                 });
//             }
//         }

//         let created;

//         if (sanitizedInquiries.length === 1) {
//             const inquiry = await ContactInquiry.create(sanitizedInquiries[0]);

//             return res.status(201).json({
//                 success: true,
//                 message: "Your inquiry has been submitted successfully",
//                 inquiryId: inquiry._id,
//                 data: inquiry,
//             });
//         }

//         created = await ContactInquiry.insertMany(sanitizedInquiries, {
//             ordered: true,
//         });

//         return res.status(201).json({
//             success: true,
//             message: `${created.length} inquiries have been submitted successfully`,
//             count: created.length,
//             inquiryIds: created.map((doc) => doc._id),
//             data: created,
//         });
//     } catch (error) {
//         next(error);
//     }
// };

// Admin: list inquiries
const getContactInquiries = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const search = normalizeText(req.query.search || "");
        const status = normalizeText(req.query.status || "");
        const destination = normalizeText(req.query.destination || "");

        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
                { message: { $regex: search, $options: "i" } },
            ];
        }

        if (status && ["new", "reviewed", "converted", "closed", "spam"].includes(status)) {
            filter.status = status;
        }

        if (destination) {
            filter.destination = { $regex: `^${destination}$`, $options: "i" };
        }

        const [inquiries, total] = await Promise.all([
            ContactInquiry.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ContactInquiry.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            inquiries,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        next(error);
    }
};

// Admin: get single inquiry
const getContactInquiryById = async (req, res, next) => {
    try {
        const inquiry = await ContactInquiry.findById(req.params.id).lean();

        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: "Contact inquiry not found",
            });
        }

        return res.status(200).json({
            success: true,
            inquiry,
        });
    } catch (error) {
        next(error);
    }
};

// Admin: update inquiry meta/status/assignment
const updateContactInquiry = async (req, res, next) => {
    try {
        const inquiry = await ContactInquiry.findById(req.params.id);

        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: "Contact inquiry not found",
            });
        }

        const { status, assignedTo, internalNotes } = req.body;

        if (typeof status !== "undefined") {
            if (!["new", "reviewed", "converted", "closed", "spam"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid inquiry status",
                });
            }
            inquiry.status = status;
        }

        if (typeof internalNotes !== "undefined") {
            inquiry.internalNotes = String(internalNotes).trim();
        }

        if (typeof assignedTo !== "undefined") {
            if (!assignedTo) {
                inquiry.assignedTo = null;
                inquiry.assignedToName = "";
            } else {
                const assignedUser = await User.findById(assignedTo).select("username");
                if (!assignedUser) {
                    return res.status(400).json({
                        success: false,
                        message: "Assigned user not found",
                    });
                }

                inquiry.assignedTo = assignedTo;
                inquiry.assignedToName = assignedUser.username;
            }
        }

        await inquiry.save();

        return res.status(200).json({
            success: true,
            message: "Contact inquiry updated successfully",
            inquiry,
        });
    } catch (error) {
        next(error);
    }
};

// Admin: convert inquiry to lead
const convertContactInquiryToLead = async (req, res, next) => {
    try {
        const inquiry = await ContactInquiry.findById(req.params.id);

        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: "Contact inquiry not found",
            });
        }

        if (inquiry.convertedLeadId) {
            return res.status(400).json({
                success: false,
                message: "This inquiry has already been converted to a lead",
            });
        }

        const lead = await Lead.create({
            name: inquiry.name,
            email: inquiry.email,
            phone: inquiry.phone,
            countryInterest:
                Array.isArray(inquiry.destinations) && inquiry.destinations.length
                    ? inquiry.destinations
                    : ["Not Specified"],
            status: "new",
            assignedTo: inquiry.assignedTo || null,
            assignedToName: inquiry.assignedToName || "",
            notes: inquiry.message,
            source: "contact_form",
            createdBy: req.user._id,
        });

        inquiry.status = "converted";
        inquiry.convertedLeadId = lead._id;
        inquiry.convertedAt = new Date();

        await inquiry.save();

        return res.status(201).json({
            success: true,
            message: "Inquiry converted to lead successfully",
            lead,
            inquiry,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    submitContactInquiry,
    getContactInquiries,
    getContactInquiryById,
    updateContactInquiry,
    convertContactInquiryToLead,
};