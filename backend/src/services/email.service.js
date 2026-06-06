const { BrevoClient } = require("@getbrevo/brevo");
const prisma = require("../config/db");

class EmailDeliveryError extends Error {
  constructor(message = "Email delivery failed") {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

let brevoClient;

const getBrevoClient = () => {
  if (!process.env.BREVO_API_KEY) throw new EmailDeliveryError("BREVO_API_KEY is not configured");
  if (!brevoClient) {
    brevoClient = new BrevoClient({ apiKey: process.env.BREVO_API_KEY, timeoutInSeconds: 30, maxRetries: 2 });
  }
  return brevoClient;
};

const parseSender = () => {
  const from = process.env.EMAIL_FROM || "noreply@odooforce.local";
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return {
    name: process.env.EMAIL_FROM_NAME || (match?.[1] || "OdooForce").trim(),
    email: (match?.[2] || from).trim(),
  };
};

const safeErrorMessage = (error) => {
  if (error instanceof EmailDeliveryError) return error.message;
  if (error?.statusCode) return `Brevo API error ${error.statusCode}`;
  return "Email delivery failed";
};

const writeFailure = async (logId, error) => {
  await prisma.emailLog.update({ where: { id: logId }, data: { status: "FAILED", errorMessage: safeErrorMessage(error) } });
};

const normalizeRecipients = (to, recipientEmail) => {
  const recipients = to || recipientEmail;
  if (!recipients) return [];
  return (Array.isArray(recipients) ? recipients : [recipients]).map((recipient) => {
    if (typeof recipient === "string") return { email: recipient };
    return { email: recipient.email, name: recipient.name };
  }).filter((recipient) => recipient.email);
};

exports.EmailDeliveryError = EmailDeliveryError;

exports.sendEmail = async ({ to, recipientEmail, subject, html, text, entityType, entityId, requireDelivery = false }) => {
  const recipients = normalizeRecipients(to, recipientEmail);
  if (!recipients.length) throw new EmailDeliveryError("Email recipient is required");

  const log = await prisma.emailLog.create({ data: { entityType, entityId, recipientEmail: recipients.map((recipient) => recipient.email).join(","), subject } });
  try {
    const client = getBrevoClient();
    await client.transactionalEmails.sendTransacEmail({
      subject,
      htmlContent: html,
      textContent: text,
      sender: parseSender(),
      to: recipients,
    });
    return prisma.emailLog.update({ where: { id: log.id }, data: { status: "SENT", sentAt: new Date() } });
  } catch (error) {
    await writeFailure(log.id, error);
    console.error("Email delivery failed", { entityType, entityId, recipientCount: recipients.length, reason: safeErrorMessage(error) });
    if (requireDelivery) throw new EmailDeliveryError();
    return prisma.emailLog.findUnique({ where: { id: log.id } });
  }
};
