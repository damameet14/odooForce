const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { logActivity } = require("../services/activityLog.service");
const { sendEmail, EmailDeliveryError } = require("../services/email.service");
const templates = require("../utils/emailTemplates");

const publicUser = (user) => {
  const { passwordHash, ...safe } = user;
  return safe;
};
const tokenFor = (user) => jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
const resetTokenFor = (user) => jwt.sign({ id: user.id, purpose: "PASSWORD_RESET" }, process.env.JWT_SECRET, { expiresIn: "1h" });
const clientUrl = () => (process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");
const sendUserEmail = (user, template, options = {}) => sendEmail({ to: user.email, entityType: "USER", entityId: user.id, ...template, ...options });
const sendOptionalUserEmail = (user, template) => {
  sendUserEmail(user, template).catch((error) => {
    const reason = error instanceof EmailDeliveryError ? error.message : "Email delivery failed";
    console.error("Auth email skipped", { userId: user.id, reason });
  });
};

exports.signup = async (req, res) => {
  const { name, email, password, phone } = req.body;
  const user = await prisma.user.create({ data: { name, email: email.toLowerCase(), phone, role: "VENDOR", passwordHash: await bcrypt.hash(password, 12) } });
  await logActivity({ userId: user.id, action: "USER_CREATED", entityType: "USER", entityId: user.id, description: `${user.name} signed up` });
  sendOptionalUserEmail(user, templates.welcomeEmail(user));
  res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
};

exports.login = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email.toLowerCase() }, include: { vendor: true } });
  if (!user || user.status !== "ACTIVE" || !(await bcrypt.compare(req.body.password, user.passwordHash))) throw new ApiError(401, "Invalid email or password");
  sendOptionalUserEmail(user, templates.loginAlertEmail(user));
  res.json({ token: tokenFor(user), user: publicUser(user) });
};

exports.me = async (req, res) => res.json({ user: req.user });
exports.logout = async (_req, res) => res.json({ message: "Logged out successfully. Remove the token from the client." });
exports.forgotPassword = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email.toLowerCase() } });
  if (!user || user.status !== "ACTIVE") return res.json({ message: "If that account exists, password reset instructions will be sent." });

  const token = resetTokenFor(user);
  const resetUrl = `${clientUrl()}/reset-password/${encodeURIComponent(token)}`;
  try {
    await sendUserEmail(user, templates.passwordResetEmail(user, resetUrl), { requireDelivery: true });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Unable to send reset email. Please try again later." });
  }
  res.json({ message: "If that account exists, password reset instructions will be sent." });
};

exports.resetPassword = async (req, res) => {
  let payload;
  try {
    payload = jwt.verify(req.body.token, process.env.JWT_SECRET);
  } catch (_error) {
    throw new ApiError(422, "Invalid or expired reset token");
  }
  if (payload.purpose !== "PASSWORD_RESET") throw new ApiError(422, "Invalid or expired reset token");
  const user = await prisma.user.update({ where: { id: payload.id }, data: { passwordHash: await bcrypt.hash(req.body.password, 12) } });
  sendOptionalUserEmail(user, templates.passwordResetSuccessEmail(user));
  res.json({ message: "Password reset successfully." });
};
