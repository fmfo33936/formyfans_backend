const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, content, attachments = []) => {
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

    if (!smtpUser || !smtpPass) {
        throw new Error("SMTP credentials are missing. Set SMTP_USER/SMTP_PASS or EMAIL_USER/EMAIL_PASS");
    }

    const useCustomSmtp = Boolean(process.env.SMTP_HOST || process.env.SMTP_USER);
    const transporter = nodemailer.createTransport(
        useCustomSmtp
            ? {
                host: process.env.SMTP_HOST || "smtp.hostinger.com",
                port: Number(process.env.SMTP_PORT || 465),
                secure: String(process.env.SMTP_SECURE || "true") === "true",
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
                connectionTimeout: 10000,
            }
            : {
                service: "gmail",
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            },
    );

    const mailOptions = {
        from: process.env.SMTP_FROM || smtpUser,
        to,
        subject,
        attachments,
    };

    if (typeof content === "string" && content.trim().startsWith("<")) {
        mailOptions.html = content;
    } else {
        mailOptions.text = content;
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        console.info("Email sent successfully:", info.response || info.messageId);
        return info;
    } catch (error) {
        console.error("Email send failed:", error.message);
        throw error;
    }
};

module.exports = sendEmail;
module.exports.sendEmail = sendEmail;