const { validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

exports.validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(422, "Validation failed", errors.array()));
  next();
};

exports.notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

exports.errorHandler = (err, _req, res, _next) => {
  if (err.code === "P2002") return res.status(409).json({ message: "A record with this value already exists", fields: err.meta?.target });
  if (err.code === "P2025") return res.status(404).json({ message: "Record not found" });
  const status = err.status || 500;
  if (status === 500) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
  res.status(status).json({ message: err.message, errors: err.details });
};
