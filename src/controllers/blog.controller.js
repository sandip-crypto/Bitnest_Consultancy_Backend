const Blog = require("../models/blog.model");
const capitalizeWords = require("../utils/capitalizeWords");
const slugify = require("../utils/slugify");
const { sanitizeBlogContent, parseBoolean } = require("../utils/sanitizeBlogContent ");

const buildUniqueSlug = async (title, excludeId = null) => {
    const base = slugify(title);
    let slug = base || `post-${Date.now()}`;
    let counter = 1;

    while (true) {
        const existing = await Blog.findOne({
            slug,
            ...(excludeId ? { _id: { $ne: excludeId } } : {}),
        }).select("_id");

        if (!existing) return slug;

        slug = `${base}-${counter}`;
        counter += 1;
    }
};

const parseTags = (tags) => {
    if (!tags) return [];
    if (Array.isArray(tags)) {
        return tags.map((t) => String(t).trim()).filter(Boolean);
    }
    if (typeof tags === "string") {
        return tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
    }
    return [];
};

const calculateReadTime = (content = "") => {
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min`;
};

const createBlog = async (req, res, next) => {
    try {
        let {
            title,
            excerpt,
            content,
            category,
            status,
            featured,
            coverImage,
            coverImageAlt,
            seoTitle,
            seoDescription,
            tags,
        } = req.body;

        if (!title || !excerpt || !content || !category) {
            return res.status(400).json({
                success: false,
                message: "Title, excerpt, content, and category are required",
            });
        }

        title = title.trim();
        excerpt = excerpt.trim();
        category = category.trim();
        content = content.trim();

        if (!title || !excerpt || !content || !category) {
            return res.status(400).json({
                success: false,
                message: "Title, excerpt, content, and category are required",
            });
        }

        let finalCoverImage = (coverImage || "").trim();

        if (req.file) {
            finalCoverImage = req.file.path;
        }

        if (!finalCoverImage) {
            return res.status(400).json({
                success: false,
                message: "Please provide either a cover image URL or upload an image",
            });
        }

        const cleanContent = sanitizeBlogContent(content);

        if (!cleanContent || cleanContent.trim().length < 20) {
            return res.status(400).json({
                success: false,
                message: "Content is invalid after sanitization",
            });
        }

        const slug = await buildUniqueSlug(title);
        const normalizedStatus = status === "published" ? "published" : "draft";
        const publishedAt = normalizedStatus === "published" ? new Date() : null;

        const blog = await Blog.create({
            title,
            slug,
            excerpt,
            content: cleanContent,
            category: capitalizeWords(category),
            readTime: calculateReadTime(cleanContent),
            coverImage: finalCoverImage,
            coverImageAlt: (coverImageAlt || "").trim(),
            author: req.user._id,
            authorName: req.user.username,
            status: normalizedStatus,
            featured: parseBoolean(featured),
            publishedAt,
            seoTitle: (seoTitle || "").trim(),
            seoDescription: (seoDescription || "").trim(),
            tags: parseTags(tags),
        });

        return res.status(201).json({
            success: true,
            message: "Blog created successfully",
            blog,
        });
    } catch (error) {
        next(error);
    }
};

const updateBlog = async (req, res, next) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }

        let {
            title,
            excerpt,
            content,
            category,
            status,
            featured,
            coverImage,
            coverImageAlt,
            seoTitle,
            seoDescription,
            tags,
        } = req.body;

        if (title && title.trim() !== blog.title) {
            blog.title = title.trim();
            blog.slug = await buildUniqueSlug(title.trim(), blog._id);
        }

        if (excerpt) blog.excerpt = excerpt.trim();

        if (content) {
            const cleanContent = sanitizeBlogContent(content.trim());

            if (!cleanContent || cleanContent.trim().length < 20) {
                return res.status(400).json({
                    success: false,
                    message: "Content is invalid after sanitization",
                });
            }

            blog.content = cleanContent;
            blog.readTime = calculateReadTime(cleanContent);
        }

        if (category) blog.category = capitalizeWords(category.trim());

        if (typeof featured !== "undefined") {
            blog.featured = parseBoolean(featured);
        }

        let finalCoverImage = typeof coverImage !== "undefined"
            ? String(coverImage).trim()
            : blog.coverImage;

        if (req.file) {
            finalCoverImage = req.file.path;
        }

        blog.coverImage = finalCoverImage;

        if (!blog.coverImage) {
            return res.status(400).json({
                success: false,
                message: "Please provide either a cover image URL or upload an image",
            });
        }

        if (typeof coverImageAlt !== "undefined") {
            blog.coverImageAlt = String(coverImageAlt).trim();
        }

        if (typeof seoTitle !== "undefined") {
            blog.seoTitle = String(seoTitle).trim();
        }

        if (typeof seoDescription !== "undefined") {
            blog.seoDescription = String(seoDescription).trim();
        }

        if (typeof tags !== "undefined") {
            blog.tags = parseTags(tags);
        }

        if (status && ["draft", "published"].includes(status)) {
            const wasDraft = blog.status === "draft";
            blog.status = status;

            if (status === "published" && (wasDraft || !blog.publishedAt)) {
                blog.publishedAt = new Date();
            }

            if (status === "draft") {
                blog.publishedAt = null;
            }
        }

        await blog.save();

        return res.status(200).json({
            success: true,
            message: "Blog updated successfully",
            blog,
        });
    } catch (error) {
        next(error);
    }
};

const deleteBlog = async (req, res, next) => {
    try {
        const { id } = req.params;

        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }

        await blog.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Blog deleted successfully",
        });
    } catch (error) {
        next(error);
    }
};

const getAdminBlogs = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        const search = (req.query.search || "").trim();
        const status = (req.query.status || "").trim();
        const category = (req.query.category || "").trim();

        const filter = {};

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { excerpt: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
                { authorName: { $regex: search, $options: "i" } },
            ];
        }

        if (status && ["draft", "published"].includes(status)) {
            filter.status = status;
        }

        if (category) {
            filter.category = { $regex: `^${category}$`, $options: "i" };
        }

        const [blogs, total] = await Promise.all([
            Blog.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Blog.countDocuments(filter),
        ]);

        return res.status(200).json({
            success: true,
            blogs,
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

const getPublishedBlogs = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(24, Math.max(1, Number(req.query.limit) || 9));
        const search = (req.query.search || "").trim();
        const category = (req.query.category || "").trim();

        const filter = { status: "published" };

        if (category && category !== "All") {
            filter.category = category;
        }

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { excerpt: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
            ];
        }

        const total = await Blog.countDocuments(filter);
        const totalPages = Math.ceil(total / limit) || 1;

        const safePage = Math.min(page, totalPages);
        const safeSkip = (safePage - 1) * limit;

        const blogs = await Blog.find(filter)
            .sort({ featured: -1, publishedAt: -1 })
            .skip(safeSkip)
            .limit(limit)
            .select("-content")
            .lean();

        return res.status(200).json({
            success: true,
            blogs,
            pagination: {
                page: safePage,
                limit,
                total,
                totalPages,
                hasPrevPage: safePage > 1,
                hasNextPage: safePage < totalPages,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getPublishedBlogCategories = async (req, res, next) => {
    try {
        const categories = await Blog.distinct("category", {
            status: "published",
        });

        return res.status(200).json({
            success: true,
            categories: ["All", ...categories.filter(Boolean).sort()],
        });
    } catch (error) {
        next(error);
    }
};

const getBlogBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;

        const blog = await Blog.findOne({
            slug,
            status: "published",
        }).lean();

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }

        await Blog.updateOne({ _id: blog._id }, { $inc: { views: 1 } });

        return res.status(200).json({
            success: true,
            blog: {
                ...blog,
                views: (blog.views || 0) + 1,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createBlog,
    updateBlog,
    deleteBlog,
    getAdminBlogs,
    getPublishedBlogs,
    getPublishedBlogCategories,
    getBlogBySlug,
};