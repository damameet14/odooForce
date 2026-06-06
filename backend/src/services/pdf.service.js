const PDFDocument = require("pdfkit");

const money = (value) => `INR ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
const BRAND_CORAL = "#e85a4f";
const BRAND_DARK = "#17233c";
const TEXT_GRAY = "#637775";

function drawHeader(doc, type, number, date) {
  doc.rect(0, 0, doc.page.width, 80).fill(BRAND_DARK);
  doc.fontSize(14).fillColor("#fff").text("OdooForce", 48, 30, { continued: false });
  doc.fontSize(11).fillColor("#8e8d8a").text("Procurement ERP", doc.page.width - 200, 28, { width: 150, align: "right" });
  doc.moveDown(2.5);
  doc.fontSize(20).fillColor(BRAND_CORAL).text(type, 48, 100, { align: "center" });
  doc.fontSize(12).fillColor(BRAND_DARK).text(number, { align: "center" });
  doc.fontSize(9).fillColor(TEXT_GRAY).text(`Date: ${date}`, { align: "center" });
  doc.moveDown(1);
  doc.y = 165;
}

function drawVendorSection(doc, vendor) {
  const y = doc.y;
  doc.rect(48, y, doc.page.width - 96, 60).fill("#f7f9f9").stroke("#dfe7e6");
  doc.fontSize(8).fillColor(TEXT_GRAY).text("VENDOR", 60, y + 8);
  doc.fontSize(11).fillColor(BRAND_DARK).text(vendor.companyName || "N/A", 60, y + 20);
  doc.fontSize(9).fillColor(TEXT_GRAY).text(`${vendor.email || ""} ${vendor.address ? " · " + vendor.address : ""}`, 60, y + 34);
  if (vendor.gstNumber) doc.text(`GST: ${vendor.gstNumber}`, 60, y + 46);
  doc.y = y + 70;
}

function drawItemTable(doc, items, columns) {
  const startX = 48;
  const widths = columns.map((c) => c.width);
  const totalW = widths.reduce((a, b) => a + b, 0);
  let y = doc.y;

  // Header
  doc.rect(startX, y, totalW, 22).fill("#f7f9f9");
  let x = startX;
  for (const col of columns) {
    doc.fontSize(7).fillColor(TEXT_GRAY).text(col.header, x + 4, y + 7, { width: col.width - 8 });
    x += col.width;
  }
  y += 22;

  // Rows
  for (const row of items) {
    if (y > doc.page.height - 120) {
      doc.addPage();
      y = 48;
    }
    x = startX;
    doc.rect(startX, y, totalW, 20).fill("#fff").stroke("#e8eeee");
    for (let i = 0; i < columns.length; i++) {
      const val = row[columns[i].key] ?? "";
      doc.fontSize(8).fillColor("#3d504f").text(String(val), x + 4, y + 5, { width: columns[i].width - 8 });
      x += columns[i].width;
    }
    y += 20;
  }
  doc.y = y + 8;
}

function drawTotals(doc, totals) {
  const x = doc.page.width - 250;
  const y = doc.y;
  doc.rect(x, y, 200, totals.length * 18 + 8).fill("#f7f9f9").stroke("#dfe7e6");
  for (let i = 0; i < totals.length; i++) {
    const ty = y + 6 + i * 18;
    const isLast = i === totals.length - 1;
    doc.fontSize(isLast ? 10 : 8).fillColor(isLast ? BRAND_CORAL : TEXT_GRAY)
      .text(totals[i].label, x + 8, ty, { width: 90 })
      .text(totals[i].value, x + 100, ty, { width: 90, align: "right" });
  }
  doc.y += totals.length * 18 + 20;
}

// ─── PO PDF ─────────────────────────────────────────────────────────────────

exports.streamPoPdf = (res, po) => {
  const doc = new PDFDocument({ margin: 48, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${po.poNumber}.pdf"`);
  doc.pipe(res);

  drawHeader(doc, "PURCHASE ORDER", po.poNumber, new Date(po.createdAt).toLocaleDateString("en-IN"));
  drawVendorSection(doc, po.vendor || {});

  const columns = [
    { header: "#", key: "num", width: 30 },
    { header: "ITEM DESCRIPTION", key: "itemName", width: 170 },
    { header: "QTY", key: "quantity", width: 50 },
    { header: "UNIT PRICE", key: "unitPrice", width: 75 },
    { header: "GST %", key: "gstPercent", width: 45 },
    { header: "TAX", key: "taxAmount", width: 65 },
    { header: "TOTAL", key: "totalAmount", width: 75 },
  ];

  const rows = (po.items || []).map((item, i) => ({
    num: i + 1,
    itemName: item.itemName,
    quantity: Number(item.quantity),
    unitPrice: money(item.unitPrice),
    gstPercent: `${Number(item.gstPercent || 18)}%`,
    taxAmount: money(item.taxAmount),
    totalAmount: money(item.totalAmount),
  }));

  drawItemTable(doc, rows, columns);

  drawTotals(doc, [
    { label: "Subtotal", value: money(po.subtotal) },
    { label: "Tax", value: money(po.taxAmount) },
    { label: "Discount", value: money(po.discountAmount) },
    { label: "Grand Total", value: money(po.grandTotal) },
  ]);

  if (po.termsConditions) {
    doc.moveDown().fontSize(8).fillColor(TEXT_GRAY).text("Terms & Conditions", 48);
    doc.fontSize(8).fillColor("#3d504f").text(po.termsConditions, 48);
  }

  doc.moveDown(3).fontSize(9).fillColor(TEXT_GRAY)
    .text("Authorized Signature: ____________________", { align: "right" });

  doc.end();
};

// ─── Invoice PDF ────────────────────────────────────────────────────────────

exports.streamInvoicePdf = (res, invoice) => {
  const doc = new PDFDocument({ margin: 48, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  doc.pipe(res);

  drawHeader(doc, "INVOICE", invoice.invoiceNumber, new Date(invoice.createdAt).toLocaleDateString("en-IN"));
  if (invoice.vendor) drawVendorSection(doc, invoice.vendor);

  if (invoice.dueDate) {
    doc.fontSize(9).fillColor(TEXT_GRAY)
      .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`, 48);
    doc.moveDown(0.5);
  }

  const columns = [
    { header: "#", key: "num", width: 30 },
    { header: "DESCRIPTION", key: "itemName", width: 200 },
    { header: "QTY", key: "quantity", width: 55 },
    { header: "RATE", key: "unitPrice", width: 90 },
    { header: "AMOUNT", key: "totalAmount", width: 90 },
  ];

  const rows = (invoice.items || []).map((item, i) => ({
    num: i + 1,
    itemName: item.itemName,
    quantity: Number(item.quantity),
    unitPrice: money(item.unitPrice),
    totalAmount: money(item.totalAmount),
  }));

  drawItemTable(doc, rows, columns);

  drawTotals(doc, [
    { label: "Subtotal", value: money(invoice.subtotal) },
    { label: "Tax", value: money(invoice.taxAmount) },
    { label: "Discount", value: money(invoice.discountAmount) },
    { label: "Total", value: money(invoice.grandTotal) },
  ]);

  doc.moveDown(2).fontSize(9).fillColor(TEXT_GRAY).text("Thank you for your business.", { align: "center" });
  doc.moveDown(3).text("Authorized Signature: ____________________", { align: "right" });
  doc.end();
};

// Legacy export for backward compatibility
exports.streamDocument = (res, type, record) => {
  if (type === "Purchase Order") return exports.streamPoPdf(res, record);
  return exports.streamInvoicePdf(res, record);
};
