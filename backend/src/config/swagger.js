const swaggerJsdoc = require("swagger-jsdoc");

module.exports = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "VendorBridge API",
      version: "1.0.0",
      description: "Procurement and Vendor Management ERP API documentation",
    },
    servers: [{ url: "http://localhost:5000", description: "Local development server" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Login: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", example: "admin@vendorbridge.com" },
            password: { type: "string", example: "password123" },
          },
        },
        Error: {
          type: "object",
          properties: { message: { type: "string" }, errors: { type: "array", items: { type: "object" } } },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
});

