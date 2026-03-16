require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const logger = require("./src/utils/logger");
const connectDB = require('./src/config/database');

const userRoutes = require("./src/routes/user.routes");
const blogRoutes = require("./src/routes/blog.routes");
const linkPreviewRoutes = require("./src/routes/linkPreview.routes");
const leadRoutes = require("./src/routes/lead.routes");
const studentRoutes = require("./src/routes/student.routes");
const contactInquiryRoutes = require("./src/routes/contactInquiry.routes");
const faqRoutes = require("./src/routes/faq.routes");
const publicLeadRoutes = require("./src/routes/publicLead.routes");


// const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const compression = require("compression");
const { verifyMailer } = require('./src/services/mail.service');

const app = express();

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL;

// const authLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 10,                   // 10 login/register attempts per IP per 15min
//     message: {
//         success: false,
//         message: "Too many attempts, please try again later.",
//     },
//     standardHeaders: true,
//     legacyHeaders: false,
// });


app.use(helmet());
app.use(
    compression({
        threshold: 1024, // only compress responses > 1KB
    })
);

app.use(express.json({ limit: "1mb" }));

app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// app.use("/uploads", express.static("uploads"));

app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(
    cors({
        origin: CLIENT_URL,
        credentials: true,
    })
);


app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/blogs", blogRoutes);
app.use("/api/v1/link-preview", linkPreviewRoutes);
app.use("/api/v1/leads", leadRoutes);
app.use("/api/v1/students", studentRoutes);
app.use("/api/v1/contact-inquiries", contactInquiryRoutes);
app.use("/api/v1/faqs", faqRoutes);
app.use("/api/v1/public-leads", publicLeadRoutes);


// Global Error Handler
app.use((err, req, res, next) => {
    logger.error(err.stack || err.message);

    if (err.message === "Only image files are allowed") {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }

    if (err.name === "MulterError") {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }

    res.status(500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

const startServer = async () => {
    await connectDB(); // Wait for DB connection before starting server

    try {
        await verifyMailer();
        logger.info("Mailer connected successfully");
    } catch (error) {
        logger.error(`Mailer connection failed: ${error.message}`);
    }

    app.listen(PORT, () => {
        console.log('Server running', { port: PORT });
    });
};

startServer().catch(err => {
    console.error('Failed to start server', { message: err.message });
    process.exit(1);
});
