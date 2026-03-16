require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/user.model");
const logger = require("../src/utils/logger");

const {
    MONGO_URI,
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    ADMIN_NAME,
    ADMIN_ROLE,
    ADMIN_FORCE_PROMOTE,
} = process.env;

const REQUIRED_VARS = ["MONGO_URI", "ADMIN_EMAIL", "ADMIN_PASSWORD"];

function validateEnv() {
    const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        logger.error(
            `Missing required environment variables: ${missing.join(", ")}`
        );
        process.exit(1);
    }
}

async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI, {
            // you can customize options if needed
        });
        logger.info("Connected to MongoDB");
    } catch (err) {
        logger.error("Failed to connect to MongoDB");
        logger.error(err);
        process.exit(1);
    }
}

async function seedAdmin() {
    validateEnv();
    await connectDB();

    const email = ADMIN_EMAIL.toLowerCase().trim();
    const role = ADMIN_ROLE || "admin";
    const name = ADMIN_NAME || "System Admin";

    try {
        const existing = await User.findOne({ email });

        if (existing) {
            if (existing.role === role) {
                logger.info(
                    `Admin already exists with email: ${email} (role: ${existing.role})`
                );
                logger.info("   No changes made.");
                process.exit(0);
            }

            // User exists but is not admin
            if (ADMIN_FORCE_PROMOTE === "true") {
                logger.info(
                    `User with email ${email} exists with role "${existing.role}".`
                );
                logger.info("   ADMIN_FORCE_PROMOTE=true → promoting to admin...");

                existing.role = role;
                await existing.save();

                logger.info(
                    `User promoted to admin. Email: ${email}, New role: ${existing.role}`
                );
                process.exit(0);
            } else {
                logger.error(
                    `User with email ${email} already exists with role "${existing.role}".`
                );
                logger.error(
                    "   To promote this user to admin, set ADMIN_FORCE_PROMOTE=true and re-run the script."
                );
                process.exit(1);
            }
        }

        // No user with this email -> create new admin user
        logger.info(`No user found with email ${email}. Creating admin user...`);

        const admin = await User.create({
            username: name,
            email,
            password: ADMIN_PASSWORD, // will be hashed by your pre-save hook
            role,
        });

        logger.info("Admin user created successfully:");
        logger.info(`   ID:    ${admin._id}`);
        logger.info(`   Email: ${admin.email}`);
        logger.info(`   Role:  ${admin.role}`);
        process.exit(0);
    } catch (err) {
        logger.error("Error while seeding admin user");
        logger.error(err);
        process.exit(1);
    }
}

seedAdmin();