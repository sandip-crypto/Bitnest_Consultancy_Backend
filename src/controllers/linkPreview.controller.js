const { getLinkPreview } = require("link-preview-js");

const getPreview = async (req, res, next) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: "URL is required",
            });
        }

        const preview = await getLinkPreview(url);

        return res.status(200).json({
            success: true,
            preview: {
                url,
                title: preview.title || "",
                description: preview.description || "",
                siteName: preview.siteName || "",
                images: Array.isArray(preview.images) ? preview.images : [],
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getPreview };