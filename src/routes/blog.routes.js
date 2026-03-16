const express = require("express");
const {
    createBlog,
    updateBlog,
    deleteBlog,
    getAdminBlogs,
    getPublishedBlogs,
    getPublishedBlogCategories,
    getBlogBySlug,
} = require("../controllers/blog.controller");
const { protect, allowRoles } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload");

const router = express.Router();

// public
router.get("/public/categories", getPublishedBlogCategories);
router.get("/public", getPublishedBlogs);
router.get("/public/:slug", getBlogBySlug);

// admin/internal
router.post(
    "/",
    protect,
    allowRoles("admin", "counselor"),
    upload.single("coverImageFile"),
    createBlog
);

router.put(
    "/:id",
    protect,
    allowRoles("admin", "counselor"),
    upload.single("coverImageFile"),
    updateBlog
);
router.get("/", protect, allowRoles("admin", "counselor"), getAdminBlogs);
router.delete("/:id", protect, allowRoles("admin"), deleteBlog);

module.exports = router;