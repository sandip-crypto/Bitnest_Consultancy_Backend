const Student = require("../models/student.model");
const User = require("../models/user.model");

const normalizeText = (value = "") => String(value).trim();

const parseCountries = (countries) => {
    if (!countries) return [];
    if (Array.isArray(countries)) {
        return countries.map((c) => String(c).trim()).filter(Boolean);
    }
    if (typeof countries === "string") {
        return countries
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
    }
    return [];
};

const createStudent = async (req, res, next) => {
    try {
        const { name, email, phone, countries, counselor, notes } = req.body;

        if (!name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and phone are required",
            });
        }

        let counselorName = "";

        if (counselor) {
            const counselorUser = await User.findById(counselor).select("username");
            if (!counselorUser) {
                return res.status(400).json({
                    success: false,
                    message: "Counselor not found",
                });
            }
            counselorName = counselorUser.username;
        }

        const student = await Student.create({
            name: normalizeText(name),
            email: normalizeText(email).toLowerCase(),
            phone: normalizeText(phone),
            countries: parseCountries(countries),
            counselor: counselor || null,
            counselorName,
            notes: normalizeText(notes),
            createdBy: req.user._id,
        });

        return res.status(201).json({
            success: true,
            message: "Student created successfully",
            student,
        });
    } catch (error) {
        next(error);
    }
};

const getStudents = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
        const skip = (page - 1) * limit;
        const search = normalizeText(req.query.search || "");

        const filter = {};

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
            ];
        }

        const [students, total] = await Promise.all([
            Student.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Student.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            students,
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

const getStudentById = async (req, res, next) => {
    try {
        const student = await Student.findById(req.params.id).lean();

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        return res.status(200).json({
            success: true,
            student,
        });
    } catch (error) {
        next(error);
    }
};

const updateStudent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const student = await Student.findById(id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        const { name, email, phone, countries, counselor, notes } = req.body;

        if (typeof name !== "undefined") student.name = normalizeText(name);
        if (typeof email !== "undefined") student.email = normalizeText(email).toLowerCase();
        if (typeof phone !== "undefined") student.phone = normalizeText(phone);
        if (typeof countries !== "undefined") student.countries = parseCountries(countries);
        if (typeof notes !== "undefined") student.notes = normalizeText(notes);

        if (typeof counselor !== "undefined") {
            if (!counselor) {
                student.counselor = null;
                student.counselorName = "";
            } else {
                const counselorUser = await User.findById(counselor).select("username");
                if (!counselorUser) {
                    return res.status(400).json({
                        success: false,
                        message: "Counselor not found",
                    });
                }
                student.counselor = counselor;
                student.counselorName = counselorUser.username;
            }
        }

        await student.save();

        return res.status(200).json({
            success: true,
            message: "Student updated successfully",
            student,
        });
    } catch (error) {
        next(error);
    }
};

const deleteStudent = async (req, res, next) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        await student.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Student deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createStudent,
    getStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
};