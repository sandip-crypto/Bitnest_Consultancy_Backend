const sanitizeHtml = require("sanitize-html");

const sanitizeBlogContent = (html = "") => {
    return sanitizeHtml(html, {
        allowedTags: [
            "p",
            "br",
            "strong",
            "b",
            "em",
            "i",
            "u",
            "s",
            "ul",
            "ol",
            "li",
            "blockquote",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "a",
            "code",
            "pre",
            "span",
        ],
        allowedAttributes: {
            a: ["href", "target", "rel"],
            li: ["data-list"],
            ol: ["class"],
            ul: ["class"],
            p: ["class"],
            span: ["class"],
        },
        allowedClasses: {
            ol: ["ql-indent-1", "ql-indent-2", "ql-indent-3", "ql-indent-4"],
            ul: ["ql-indent-1", "ql-indent-2", "ql-indent-3", "ql-indent-4"],
            p: [
                "ql-align-center",
                "ql-align-right",
                "ql-align-justify",
                "ql-indent-1",
                "ql-indent-2",
                "ql-indent-3",
                "ql-indent-4",
            ],
            span: [
                "ql-size-small",
                "ql-size-large",
                "ql-size-huge",
            ],
        },
        allowedSchemes: ["http", "https", "mailto"],
        transformTags: {
            a: (tagName, attribs) => {
                let href = attribs.href || "";

                if (href && !/^https?:\/\//i.test(href) && !/^mailto:/i.test(href)) {
                    href = `https://${href}`;
                }

                return {
                    tagName: "a",
                    attribs: {
                        href,
                        target: "_blank",
                        rel: "noopener noreferrer",
                    },
                };
            },
        },
    });
};

const parseBoolean = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        return value.toLowerCase() === "true";
    }
    return false;
};

module.exports = {
    sanitizeBlogContent,
    parseBoolean,
};