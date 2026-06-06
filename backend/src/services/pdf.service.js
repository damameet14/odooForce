const PDFDocument = require("pdfkit");

const money = (value) => `INR ${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

exports.streamDocument = (res, type, record) => {
  const number = type === "Purchase Order" ? record.poNumber : record.invoiceNumber;
  const doc = new PDFDocument({ margin: 48 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${number}.pdf"`);
  doc.pipe(res);
  doc.fontSize(22).fillColor("#153e75").text("VendorBridge", { continued: true })
    .fillColor("#111827").fontSize(12).text(`  ${type}`, { align: "right" });
  doc.moveDown().fontSize(10).text(`Document No: ${number}`).text(`Date: ${new Date(record.createdAt).toLocaleDateString()}`);
  doc.moveDown().fontSize(12).text("Vendor", { underline: true });
  doc.fontSize(10).text(record.vendor.companyName).text(record.vendor.email).text(record.vendor.address || "");
  doc.moveDown().fontSize(12).text("Items", { underline: true });
  record.items.forEach((item, index) => {
    doc.fontSize(10).text(`${index + 1}. ${item.itemName} | Qty: ${item.quantity} | Unit price: ${money(item.unitPrice)} | Total: ${money(item.totalAmount)}`);
  });
  doc.moveDown().text(`Subtotal: ${money(record.subtotal)}`, { align: "right" })
    .text(`Tax: ${money(record.taxAmount)}`, { align: "right" })
    .text(`Discount: ${money(record.discountAmount)}`, { align: "right" })
    .fontSize(13).text(`Grand Total: ${money(record.grandTotal)}`, { align: "right" });
  doc.moveDown(2).fontSize(10).text(record.termsConditions || "Terms and conditions apply.");
  doc.moveDown(3).text("Authorized signature: ____________________", { align: "right" });
  doc.end();
};

