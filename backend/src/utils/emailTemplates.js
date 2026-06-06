const appName = "VendorBridge";

const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const base = ({ title, body }) => ({
  subject: title,
  text: body.map((line) => line.replace(/<[^>]+>/g, "")).join("\n\n"),
  html: `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#172033">
      <h2 style="margin:0 0 16px">${escapeHtml(title)}</h2>
      ${body.map((line) => `<p style="margin:0 0 12px">${line}</p>`).join("")}
    </div>
  `,
});

exports.welcomeEmail = (user) => base({
  title: `Welcome to ${appName}`,
  body: [
    `Hi ${escapeHtml(user.name)},`,
    `Your ${appName} account has been created successfully.`,
  ],
});

exports.loginAlertEmail = (user) => base({
  title: `${appName} login alert`,
  body: [
    `Hi ${escapeHtml(user.name)},`,
    `Your account was just used to sign in. If this was not you, reset your password or contact an administrator immediately.`,
  ],
});

exports.passwordResetEmail = (user, resetUrl) => base({
  title: `${appName} password reset`,
  body: [
    `Hi ${escapeHtml(user.name)},`,
    `Use this secure link to reset your password: <a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a>`,
    "If you did not request this reset, you can ignore this email.",
  ],
});

exports.passwordResetSuccessEmail = (user) => base({
  title: `${appName} password reset successful`,
  body: [
    `Hi ${escapeHtml(user.name)},`,
    "Your password was reset successfully.",
  ],
});

exports.accountDeletedEmail = (user) => base({
  title: `${appName} account deactivated`,
  body: [
    `Hi ${escapeHtml(user.name)},`,
    `Your ${appName} account has been deactivated. Contact your administrator if this was unexpected.`,
  ],
});

exports.purchaseOrderEmail = (po) => base({
  title: `Purchase Order ${po.poNumber}`,
  body: [`Your purchase order ${escapeHtml(po.poNumber)} has been generated.`],
});

exports.invoiceEmail = (invoice) => base({
  title: `Invoice ${invoice.invoiceNumber}`,
  body: [`Invoice ${escapeHtml(invoice.invoiceNumber)} has been generated.`],
});
