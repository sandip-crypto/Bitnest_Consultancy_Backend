const capitalizeWords = (text = "") => {
    return text
        .trim()
        .split(/\s+/)
        .map(word => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

module.exports = capitalizeWords;