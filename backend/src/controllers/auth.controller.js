const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { logActivity } = require("../services/activityLog.service");

const publicUser = (user) => {
  const { passwordHash, ...safe } = user;
  return safe;
};
const tokenFor = (user) => jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

exports.signup = async (req, res) => {
  const { name, email, password, phone } = req.body;
  const user = await prisma.user.create({ data: { name, email: email.toLowerCase(), phone, role: "VENDOR", passwordHash: await bcrypt.hash(password, 12) } });
  await logActivity({ userId: user.id, action: "USER_CREATED", entityType: "USER", entityId: user.id, description: `${user.name} signed up` });
  res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
};

exports.login = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email.toLowerCase() }, include: { vendor: true } });
  if (!user || user.status !== "ACTIVE" || !(await bcrypt.compare(req.body.password, user.passwordHash))) throw new ApiError(401, "Invalid email or password");
  res.json({ token: tokenFor(user), user: publicUser(user) });
};

exports.me = async (req, res) => res.json({ user: req.user });
exports.logout = async (_req, res) => res.json({ message: "Logged out successfully. Remove the token from the client." });
exports.forgotPassword = async (_req, res) => res.json({ message: "If that account exists, password reset instructions will be sent." });
