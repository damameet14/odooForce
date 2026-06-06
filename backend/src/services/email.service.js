const nodemailer = require("nodemailer");
const prisma = require("../config/db");

exports.sendEmail = async ({ entityType, entityId, recipientEmail, subject, text }) => {
  const log = await prisma.emailLog.create({ data: { entityType, entityId, recipientEmail, subject } });
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return prisma.emailLog.update({ where: { id: log.id }, data: { status: "SKIPPED", errorMessage: "SMTP credentials are not configured" } });
  }
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to: recipientEmail, subject, text });
    return prisma.emailLog.update({ where: { id: log.id }, data: { status: "SENT", sentAt: new Date() } });
  } catch (error) {
    await prisma.emailLog.update({ where: { id: log.id }, data: { status: "FAILED", errorMessage: error.message } });
    throw error;
  }
};

