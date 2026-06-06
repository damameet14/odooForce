const ApiError = require("../utils/ApiError");

exports.validateEnvironment = () => {
  const required = ["DATABASE_URL", "JWT_SECRET", "FRONTEND_URL"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new ApiError(500, `Missing required environment variables: ${missing.join(", ")}`);
  if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL)) {
    throw new ApiError(500, "DATABASE_URL must be a PostgreSQL connection URL");
  }
  if (process.env.JWT_SECRET.length < 32) throw new ApiError(500, "JWT_SECRET must be at least 32 characters");
  if (Boolean(process.env.EMAIL_USER) !== Boolean(process.env.EMAIL_PASS)) {
    throw new ApiError(500, "EMAIL_USER and EMAIL_PASS must be configured together");
  }
};
