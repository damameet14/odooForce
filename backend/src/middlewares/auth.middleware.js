const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");

exports.protect = async (req, _res, next) => {
  try {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : null;
    if (!token) throw new ApiError(401, "Authentication required");
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, role: true, status: true, vendor: { select: { id: true } } },
    });
    if (!user || user.status !== "ACTIVE") throw new ApiError(401, "User is inactive or no longer exists");
    req.user = { ...user, vendorId: user.vendor?.id };
    next();
  } catch (error) {
    next(error.name === "JsonWebTokenError" || error.name === "TokenExpiredError"
      ? new ApiError(401, "Invalid or expired token")
      : error);
  }
};

exports.authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) return next(new ApiError(403, "You do not have permission to perform this action"));
  next();
};

