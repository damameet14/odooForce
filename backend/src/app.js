const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const { rateLimit } = require("express-rate-limit");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const { validateEnvironment } = require("./config/env");
const routes = require("./routes");
const { errorHandler, notFound } = require("./middlewares/error.middleware");

validateEnvironment();
const app = express();
if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL.split(",").map((value) => value.trim()), credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));
app.get("/health", (_req, res) => res.json({ status: "ok", service: "OdooForce API" }));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: "draft-8", legacyHeaders: false }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: "draft-8", legacyHeaders: false }));
app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
