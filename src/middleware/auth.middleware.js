const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const logger = require("../utils/logger");

const protect = async (req, res, next) => {
    let token;

    try {
        // 1. Get token from cookies (access token)
        token = req.cookies.accessToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized, no token",
            });
        }

        // 2. Verify token
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // 3. Attach user to request (exclude password)
        req.user = await User.findById(decoded.id).select("-password");

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        // Block inactive users mid-session
        if (req.user.status !== "active") {
            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
            return res.status(403).json({
                success: false,
                code: "ACCOUNT_INACTIVE",
                message:
                    "Your account has been deactivated. Please contact the administrator.",
            });
        }
        // 4. Continue
        next();
    } catch (error) {
        logger.error("Auth middleware error:", error.message);

        // If token expired, we can give a specific message so frontend knows to call /refresh
        const message =
            error.name === "TokenExpiredError"
                ? "Access token expired"
                : "Not authorized, token failed";

        return res.status(401).json({
            success: false,
            message,
        });
    }
};


const allowRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }
        next();
    };
};

module.exports = { protect, allowRoles };