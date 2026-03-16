const FAQ = require("../models/faq.model");
const slugify = require("../utils/slugify");

// Helper: ensure unique slug
const generateUniqueSlug = async (question, excludeId = null) => {
    const baseSlug = slugify(question);
    let slug = baseSlug || `faq-${Date.now()}`;
    let counter = 1;

    while (true) {
        const existing = await FAQ.findOne({
            slug,
            ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        }).select("_id");

        if (!existing) return slug;

        slug = `${baseSlug}-${counter++}`;
    }
};

// @desc    Get public FAQs
// @route   GET /api/v1/faqs/public
// @access  Public
const getPublicFaqs = async (req, res, next) => {
    try {
        const category = (req.query.category || "").trim();
        const search = (req.query.search || "").trim();

        const filter = { isActive: true };

        if (category && category !== "All") {
            filter.category = category;
        }

        if (search) {
            filter.$or = [
                { question: { $regex: search, $options: "i" } },
                { answer: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
            ];
        }

        const faqs = await FAQ.find(filter)
            .sort({ featured: -1, order: 1, createdAt: -1 })
            .select("question answer category slug order featured updatedAt")
            .lean();

        return res.status(200).json({
            success: true,
            faqs,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get public FAQ categories
// @route   GET /api/v1/faqs/public/categories
// @access  Public
const getPublicFaqCategories = async (req, res, next) => {
    try {
        const categories = await FAQ.distinct("category", { isActive: true });

        return res.status(200).json({
            success: true,
            categories: ["All", ...categories.filter(Boolean).sort()],
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get admin FAQs
// @route   GET /api/v1/faqs
// @access  Private/Admin
const getAdminFaqs = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
        const skip = (page - 1) * limit;
        const search = (req.query.search || "").trim();
        const category = (req.query.category || "").trim();
        const status = (req.query.status || "").trim();

        const filter = {};

        if (category && category !== "All") {
            filter.category = category;
        }

        if (status === "active") {
            filter.isActive = true;
        } else if (status === "inactive") {
            filter.isActive = false;
        }

        if (search) {
            filter.$or = [
                { question: { $regex: search, $options: "i" } },
                { answer: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
            ];
        }

        const [faqs, total] = await Promise.all([
            FAQ.find(filter)
                .sort({ featured: -1, order: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            FAQ.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            faqs,
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

// @desc    Get FAQ by id
// @route   GET /api/v1/faqs/:id
// @access  Private/Admin
const getFaqById = async (req, res, next) => {
    try {
        const faq = await FAQ.findById(req.params.id).lean();

        if (!faq) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found",
            });
        }

        return res.status(200).json({
            success: true,
            faq,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create FAQ
// @route   POST /api/v1/faqs
// @access  Private/Admin
const createFaq = async (req, res, next) => {
    try {
        const {
            question,
            answer,
            category = "General",
            order = 0,
            isActive = true,
            featured = false,
        } = req.body;

        const trimmedQuestion = String(question || "").trim();
        const trimmedAnswer = String(answer || "").trim();
        const trimmedCategory = String(category || "General").trim();

        if (!trimmedQuestion) {
            return res.status(400).json({
                success: false,
                message: "Question is required",
            });
        }

        if (!trimmedAnswer) {
            return res.status(400).json({
                success: false,
                message: "Answer is required",
            });
        }

        const slug = await generateUniqueSlug(trimmedQuestion);

        const faq = await FAQ.create({
            question: trimmedQuestion,
            answer: trimmedAnswer,
            category: trimmedCategory || "General",
            slug,
            order: Number(order) || 0,
            isActive: Boolean(isActive),
            featured: Boolean(featured),
            createdBy: req.user?._id || null,
            updatedBy: req.user?._id || null,
        });

        return res.status(201).json({
            success: true,
            message: "FAQ created successfully",
            faq,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update FAQ
// @route   PUT /api/v1/faqs/:id
// @access  Private/Admin
const updateFaq = async (req, res, next) => {
    try {
        const faq = await FAQ.findById(req.params.id);

        if (!faq) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found",
            });
        }

        const {
            question,
            answer,
            category,
            order,
            isActive,
            featured,
        } = req.body;

        if (typeof question !== "undefined") {
            faq.question = String(question).trim();
        }

        if (typeof answer !== "undefined") {
            faq.answer = String(answer).trim();
        }

        if (typeof category !== "undefined") {
            faq.category = String(category).trim() || "General";
        }

        if (typeof order !== "undefined") {
            faq.order = Number(order) || 0;
        }

        if (typeof isActive !== "undefined") {
            faq.isActive = Boolean(isActive);
        }

        if (typeof featured !== "undefined") {
            faq.featured = Boolean(featured);
        }

        if (typeof question !== "undefined") {
            faq.slug = await generateUniqueSlug(faq.question, faq._id);
        }

        faq.updatedBy = req.user?._id || null;

        await faq.save();

        return res.status(200).json({
            success: true,
            message: "FAQ updated successfully",
            faq,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete FAQ
// @route   DELETE /api/v1/faqs/:id
// @access  Private/Admin
const deleteFaq = async (req, res, next) => {
    try {
        const faq = await FAQ.findById(req.params.id);

        if (!faq) {
            return res.status(404).json({
                success: false,
                message: "FAQ not found",
            });
        }

        await faq.deleteOne();

        return res.status(200).json({
            success: true,
            message: "FAQ deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Bulk reorder FAQs
// @route   PATCH /api/v1/faqs/reorder
// @access  Private/Admin
const reorderFaqs = async (req, res, next) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Items array is required",
            });
        }

        const bulkOps = items.map((item) => ({
            updateOne: {
                filter: { _id: item.id },
                update: {
                    $set: {
                        order: Number(item.order) || 0,
                        updatedBy: req.user?._id || null,
                    },
                },
            },
        }));

        await FAQ.bulkWrite(bulkOps);

        return res.status(200).json({
            success: true,
            message: "FAQs reordered successfully",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPublicFaqs,
    getPublicFaqCategories,
    getAdminFaqs,
    getFaqById,
    createFaq,
    updateFaq,
    deleteFaq,
    reorderFaqs,
};