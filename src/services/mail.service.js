const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendMail = async ({ to, subject, html, text, replyTo }) => {
    return transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        replyTo,
        subject,
        html,
        text,
    });
};

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const buildInternalInquiryEmail = (inquiry) => {
    const safeName = escapeHtml(inquiry.name);
    const safeEmail = escapeHtml(inquiry.email);
    const safePhone = escapeHtml(inquiry.phone || "—");
    const safeDestination = escapeHtml(inquiry.destination || "—");
    const safeMessage = escapeHtml(inquiry.message || "");

    return {
        subject: `New Contact Inquiry: ${inquiry.name}`,
        text: `
New contact inquiry received.

Name: ${inquiry.name}
Email: ${inquiry.email}
Phone: ${inquiry.phone || "—"}
Destination: ${inquiry.destination || "—"}

Message:
${inquiry.message}
        `.trim(),
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                <h2 style="margin-bottom: 16px;">New Contact Inquiry Received</h2>
                <p><strong>Name:</strong> ${safeName}</p>
                <p><strong>Email:</strong> ${safeEmail}</p>
                <p><strong>Phone:</strong> ${safePhone}</p>
                <p><strong>Destination:</strong> ${safeDestination}</p>
                <div style="margin-top: 20px;">
                    <p><strong>Message:</strong></p>
                    <div style="padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; white-space: pre-wrap;">
                        ${safeMessage}
                    </div>
                </div>
            </div>
        `,
    };
};

const buildUserAutoReplyEmail = (inquiry) => {
    const safeName = escapeHtml(inquiry.name);

    return {
        subject: "We received your inquiry",
        text: `
Hello ${inquiry.name},

Thank you for contacting BitNest Consultancy.

We have received your message and our team will get back to you as soon as possible.

Best regards,
BitNest Consultancy
        `.trim(),
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
                <p>Hello ${safeName},</p>
                <p>Thank you for contacting <strong>BitNest Consultancy</strong>.</p>
                <p>We have received your message and our team will get back to you as soon as possible.</p>
                <p style="margin-top: 20px;">Best regards,<br/>BitNest Consultancy</p>
            </div>
        `,
    };
};

const sendInquiryNotificationToStaff = async (inquiry) => {
    const email = buildInternalInquiryEmail(inquiry);

    return sendMail({
        to: process.env.MAIL_TO_STAFF,
        subject: email.subject,
        html: email.html,
        text: email.text,
        replyTo: inquiry.email,
    });
};

const sendInquiryAutoReplyToUser = async (inquiry) => {
    const email = buildUserAutoReplyEmail(inquiry);

    return sendMail({
        to: inquiry.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
    });
};

const verifyMailer = async () => {
    return transporter.verify();
};

module.exports = {
    verifyMailer,
    sendInquiryNotificationToStaff,
    sendInquiryAutoReplyToUser,
};