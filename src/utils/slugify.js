const slugify = (text = "") => {
    return text
        .toString()
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .toLowerCase()
        .replace(/[-\s]+/g, "-")
        .replace(/^-+|-+$/g, "");
};

module.exports = slugify;