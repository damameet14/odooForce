const appName = "VendorBridge";

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const brandHeader = `
  <div style="background:#10282a;padding:20px 28px;border-radius:8px 8px 0 0">
    <table width="100%"><tr>
      <td><span style="display:inline-block;background:#e9b44c;color:#14292b;font-weight:800;padding:6px 10px;border-radius:5px;font-size:14px">VB</span>
      <span style="color:#fff;font-size:16px;font-weight:700;margin-left:8px">${appName}</span></td>
      <td style="text-align:right;color:#8fa6a5;font-size:11px">Procurement ERP</td>
    </tr></table>
  </div>`;

const wrapper = (content) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#f3f6f6;padding:20px">
    <div style="background:#fff;border-radius:8px;overflow:hidden;border:1px solid #dfe7e6">
      ${brandHeader}
      <div style="padding:24px 28px;color:#172033;line-height:1.6;font-size:13px">
        ${content}
      </div>
    </div>
    <p style="text-align:center;color:#8fa6a5;font-size:10px;margin-top:12px">${appName} · Automated notification</p>
  </div>`;

const itemTable = (headers, rows) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dfe7e6;border-radius:5px;margin:14px 0;border-collapse:collapse">
    <thead><tr style="background:#f7f9f9">
      ${headers.map((h) => `<th style="padding:9px 12px;text-align:left;color:#637775;font-size:10px;text-transform:uppercase;border-bottom:1px solid #dfe7e6">${h}</th>`).join("")}
    </tr></thead>
    <tbody>
      ${rows.map((row) => `<tr>${row.map((cell) => `<td style="padding:10px 12px;border-bottom:1px solid #e8eeee;font-size:12px;color:#3d504f">${cell}</td>`).join("")}</tr>`).join("")}
    </tbody>
  </table>`;

const base = ({ title, body }) => ({
  subject: title,
  text: body
    .map((line) => line.replace(/<[^>]+>/g, ""))
    .join("\n\n"),
  html: wrapper(body.map((line) => `<p style="margin:0 0 12px">${line}</p>`).join("")),
});

// ─── Auth Emails ────────────────────────────────────────────────────────────

exports.welcomeEmail = (user) =>
  base({
    title: `Welcome to ${appName}`,
    body: [
      `Hi ${escapeHtml(user.name)},`,
      `Your ${appName} account has been created successfully.`,
    ],
  });

exports.loginAlertEmail = (user) =>
  base({
    title: `${appName} login alert`,
    body: [
      `Hi ${escapeHtml(user.name)},`,
      `Your account was just used to sign in. If this was not you, reset your password or contact an administrator immediately.`,
    ],
  });

exports.passwordResetEmail = (user, resetUrl) =>
  base({
    title: `${appName} password reset`,
    body: [
      `Hi ${escapeHtml(user.name)},`,
      `Use this secure link to reset your password: <a href="${escapeHtml(resetUrl)}" style="color:#167d71">${escapeHtml(resetUrl)}</a>`,
      "If you did not request this reset, you can ignore this email.",
    ],
  });

exports.passwordResetSuccessEmail = (user) =>
  base({
    title: `${appName} password reset successful`,
    body: [`Hi ${escapeHtml(user.name)},`, "Your password was reset successfully."],
  });

exports.accountDeletedEmail = (user) =>
  base({
    title: `${appName} account deactivated`,
    body: [
      `Hi ${escapeHtml(user.name)},`,
      `Your ${appName} account has been deactivated. Contact your administrator if this was unexpected.`,
    ],
  });

// ─── RFQ Invite Email (Vendor receives) ─────────────────────────────────────

exports.rfqInviteEmail = (rfq, vendorItems, vendor) => {
  const rows = vendorItems.map((item, i) => [
    i + 1,
    escapeHtml(item.itemName),
    escapeHtml(item.description || "-"),
    `${Number(item.quantity)} ${escapeHtml(item.unit)}`,
    item.deadline ? new Date(item.deadline).toLocaleDateString("en-IN") : "-",
  ]);

  const tableHtml = itemTable(["#", "Item", "Description", "Quantity", "Due Date"], rows);

  return {
    subject: `New RFQ: ${rfq.rfqNumber} — ${rfq.title}`,
    text: `Dear ${vendor.companyName},\n\nYou have been invited to quote on RFQ ${rfq.rfqNumber}: ${rfq.title}.\n\nItems:\n${vendorItems.map((item, i) => `${i + 1}. ${item.itemName} — ${item.quantity} ${item.unit}`).join("\n")}\n\nPlease log in to VendorBridge to submit your quotation.`,
    html: wrapper(`
      <h2 style="margin:0 0 6px;font-size:18px;color:#172033">New Request for Quotation</h2>
      <p style="color:#718180;font-size:12px;margin:0 0 16px">${escapeHtml(rfq.rfqNumber)} · ${escapeHtml(rfq.title)}</p>
      <p>Dear <strong>${escapeHtml(vendor.companyName)}</strong>,</p>
      <p>You have been invited to submit a quotation for the following items:</p>
      ${tableHtml}
      <p style="margin-top:16px">Please log in to <strong>${appName}</strong> to review details and submit your quotation before the deadline.</p>
      ${rfq.description ? `<p style="color:#718180;font-size:11px;margin-top:12px"><strong>Description:</strong> ${escapeHtml(rfq.description)}</p>` : ""}
    `),
  };
};

// ─── Quotation Received (Procurement Officer receives) ──────────────────────

exports.quotationReceivedEmail = (quotation, rfq) => {
  const rows = quotation.items.map((item, i) => [
    i + 1,
    escapeHtml(item.rfqItem?.itemName || "Item"),
    `${Number(item.quantity)}`,
    money(item.unitPrice),
    `${Number(item.gstPercent || item.taxPercentage)}%`,
    money(item.totalAmount),
  ]);

  return {
    subject: `Quotation Received: ${quotation.quotationNumber} for ${rfq.rfqNumber}`,
    text: `Vendor ${quotation.vendor.companyName} has submitted quotation ${quotation.quotationNumber} for RFQ ${rfq.rfqNumber}.\n\nGrand Total: ${money(quotation.grandTotal)}\nDelivery: ${quotation.deliveryTimeline || quotation.deliveryDays + " days"}`,
    html: wrapper(`
      <h2 style="margin:0 0 6px;font-size:18px">Quotation Received</h2>
      <p style="color:#718180;font-size:12px;margin:0 0 16px">${escapeHtml(quotation.quotationNumber)} · ${escapeHtml(rfq.rfqNumber)}</p>
      <p><strong>${escapeHtml(quotation.vendor.companyName)}</strong> has submitted a quotation.</p>
      ${itemTable(["#", "Item", "Qty", "Unit Price", "GST", "Total"], rows)}
      <div style="background:#f7f9f9;padding:12px;border-radius:5px;margin-top:12px">
        <table width="100%">
          <tr><td style="font-size:12px;color:#637775">Subtotal</td><td style="text-align:right;font-weight:600">${money(quotation.subtotal)}</td></tr>
          <tr><td style="font-size:12px;color:#637775">Tax</td><td style="text-align:right;font-weight:600">${money(quotation.taxAmount)}</td></tr>
          <tr><td style="font-size:13px;font-weight:700">Grand Total</td><td style="text-align:right;font-weight:700;font-size:14px;color:#167d71">${money(quotation.grandTotal)}</td></tr>
        </table>
      </div>
      <p style="font-size:11px;color:#718180;margin-top:12px">Delivery: ${escapeHtml(quotation.deliveryTimeline || (quotation.deliveryDays + " days"))}</p>
    `),
  };
};

// ─── Approval Request (Finance receives) ────────────────────────────────────

exports.approvalRequestEmail = (rfq, selectedItems) => {
  const rows = selectedItems.map((item, i) => [
    i + 1,
    escapeHtml(item.itemName),
    escapeHtml(item.vendorName),
    `${item.quantity}`,
    money(item.unitPrice),
    `${item.gstPercent}%`,
    money(item.totalAmount),
  ]);

  const total = selectedItems.reduce((sum, i) => sum + i.totalAmount, 0);

  return {
    subject: `Approval Required: ${rfq.rfqNumber} — ${rfq.title}`,
    text: `RFQ ${rfq.rfqNumber} requires finance approval.\n\nTotal: ${money(total)}\n\nItems:\n${selectedItems.map((i, n) => `${n + 1}. ${i.itemName} — ${i.vendorName} — ${money(i.totalAmount)}`).join("\n")}`,
    html: wrapper(`
      <h2 style="margin:0 0 6px;font-size:18px">Approval Required</h2>
      <p style="color:#718180;font-size:12px;margin:0 0 16px">${escapeHtml(rfq.rfqNumber)} · ${escapeHtml(rfq.title)}</p>
      <p>The procurement team has selected the following quotes for your review:</p>
      ${itemTable(["#", "Item", "Vendor", "Qty", "Unit Price", "GST", "Total"], rows)}
      <div style="background:#e9f4f1;padding:14px;border-radius:5px;text-align:right">
        <span style="font-size:11px;color:#637775">Total Amount: </span>
        <strong style="font-size:18px;color:#167d71">${money(total)}</strong>
      </div>
      <p style="margin-top:16px">Please log in to ${appName} to review and approve or reject this request.</p>
    `),
  };
};

// ─── Approval Decision (Procurement receives) ───────────────────────────────

exports.approvalDecisionEmail = (rfq, status, remarks) =>
  base({
    title: `${rfq.rfqNumber}: ${status === "APPROVED" ? "Approved ✓" : status === "REJECTED" ? "Rejected ✗" : "Revision Requested"}`,
    body: [
      `RFQ <strong>${escapeHtml(rfq.rfqNumber)}</strong> has been <strong>${status.toLowerCase().replace("_", " ")}</strong> by Finance.`,
      ...(remarks ? [`<em>Remarks: ${escapeHtml(remarks)}</em>`] : []),
      status === "APPROVED"
        ? "You can now generate purchase orders for the approved items."
        : "Please review the feedback and take appropriate action.",
    ],
  });

// ─── Purchase Order Email (Vendor receives) ─────────────────────────────────

exports.purchaseOrderEmail = (po, vendor) => {
  const rows = po.items.map((item, i) => [
    i + 1,
    escapeHtml(item.itemName),
    `${Number(item.quantity)}`,
    money(item.unitPrice),
    `${Number(item.gstPercent || 18)}%`,
    money(item.taxAmount),
    money(item.totalAmount),
  ]);

  return {
    subject: `Purchase Order ${po.poNumber}`,
    text: `Dear ${vendor.companyName},\n\nPurchase Order ${po.poNumber} has been generated.\n\nItems:\n${po.items.map((i, n) => `${n + 1}. ${i.itemName} — Qty: ${i.quantity} — Total: ${money(i.totalAmount)}`).join("\n")}\n\nGrand Total: ${money(po.grandTotal)}`,
    html: wrapper(`
      <div style="text-align:center;margin-bottom:16px">
        <h2 style="margin:0;font-size:20px;color:#153e75">PURCHASE ORDER</h2>
        <p style="color:#167d71;font-weight:700;font-size:14px;margin:4px 0">${escapeHtml(po.poNumber)}</p>
        <p style="color:#718180;font-size:11px;margin:0">Date: ${new Date(po.createdAt).toLocaleDateString("en-IN")}</p>
      </div>
      <div style="background:#f7f9f9;padding:12px;border-radius:5px;margin-bottom:14px">
        <p style="margin:0;font-size:11px;color:#637775">VENDOR</p>
        <p style="margin:4px 0 0;font-weight:600">${escapeHtml(vendor.companyName)}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#718180">${escapeHtml(vendor.email)} ${vendor.address ? " · " + escapeHtml(vendor.address) : ""}</p>
        ${vendor.gstNumber ? `<p style="margin:2px 0 0;font-size:11px;color:#718180">GST: ${escapeHtml(vendor.gstNumber)}</p>` : ""}
      </div>
      ${itemTable(["#", "Item", "Qty", "Unit Price", "GST %", "Tax", "Total"], rows)}
      <div style="background:#f7f9f9;padding:12px;border-radius:5px">
        <table width="100%">
          <tr><td style="font-size:12px;color:#637775">Subtotal</td><td style="text-align:right">${money(po.subtotal)}</td></tr>
          <tr><td style="font-size:12px;color:#637775">Tax</td><td style="text-align:right">${money(po.taxAmount)}</td></tr>
          <tr style="border-top:1px solid #dfe7e6"><td style="font-size:14px;font-weight:700;padding-top:8px">Grand Total</td><td style="text-align:right;font-weight:700;font-size:16px;color:#167d71;padding-top:8px">${money(po.grandTotal)}</td></tr>
        </table>
      </div>
      ${po.termsConditions ? `<p style="font-size:11px;color:#718180;margin-top:12px"><strong>Terms:</strong> ${escapeHtml(po.termsConditions)}</p>` : ""}
    `),
  };
};

// ─── Invoice Generated Email ────────────────────────────────────────────────

exports.invoiceGeneratedEmail = (invoice) => {
  const rows = invoice.items.map((item, i) => [
    i + 1,
    escapeHtml(item.itemName),
    `${Number(item.quantity)}`,
    money(item.unitPrice),
    money(item.totalAmount),
  ]);

  return {
    subject: `Invoice ${invoice.invoiceNumber}`,
    text: `Invoice ${invoice.invoiceNumber} has been generated.\nGrand Total: ${money(invoice.grandTotal)}\nDue Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "N/A"}`,
    html: wrapper(`
      <div style="background:#167d71;color:#fff;padding:16px;border-radius:5px;margin-bottom:14px">
        <table width="100%"><tr>
          <td><p style="margin:0;font-size:11px;opacity:.8">INVOICE</p><h2 style="margin:4px 0 0;font-size:20px">${escapeHtml(invoice.invoiceNumber)}</h2></td>
          <td style="text-align:right">
            <p style="margin:0;font-size:11px;opacity:.8">Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}</p>
            ${invoice.dueDate ? `<p style="margin:2px 0 0;font-size:11px;opacity:.8">Due: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}</p>` : ""}
          </td>
        </tr></table>
      </div>
      ${invoice.vendor ? `<p style="font-size:12px;color:#637775">Vendor: <strong style="color:#172033">${escapeHtml(invoice.vendor.companyName)}</strong></p>` : ""}
      ${itemTable(["#", "Item", "Qty", "Rate", "Amount"], rows)}
      <div style="background:#f7f9f9;padding:12px;border-radius:5px">
        <table width="100%">
          <tr><td style="font-size:12px;color:#637775">Subtotal</td><td style="text-align:right">${money(invoice.subtotal)}</td></tr>
          <tr><td style="font-size:12px;color:#637775">Tax</td><td style="text-align:right">${money(invoice.taxAmount)}</td></tr>
          <tr><td style="font-size:12px;color:#637775">Discount</td><td style="text-align:right">${money(invoice.discountAmount)}</td></tr>
          <tr style="border-top:2px solid #167d71"><td style="font-size:14px;font-weight:700;padding-top:8px">Total</td><td style="text-align:right;font-weight:700;font-size:16px;color:#167d71;padding-top:8px">${money(invoice.grandTotal)}</td></tr>
        </table>
      </div>
    `),
  };
};

// ─── PO Ready to Send (Procurement receives after finance approval) ─────────

exports.poReadyEmail = (rfq) =>
  base({
    title: `${rfq.rfqNumber}: Ready for PO Generation`,
    body: [
      `Finance has approved RFQ <strong>${escapeHtml(rfq.rfqNumber)}</strong>.`,
      "You can now generate purchase orders for the approved items.",
    ],
  });
