# odooForce - Hackathon Idea Document

## 1. Project Title

odooForce: Role-Based Procurement and Vendor Management ERP

## 2. Problem Statement

Many small and mid-sized organizations still manage procurement through scattered emails, spreadsheets, manual approvals, and disconnected vendor communication. This creates delays, missing audit trails, unclear quotation comparison, weak vendor isolation, and poor visibility for managers.

Procurement teams need one structured system to create RFQs, invite vendors, collect quotations, compare offers, request manager approval, generate purchase orders, track delivery, manage invoices, and preserve a reliable audit trail.

## 3. Proposed Solution

odooForce is a web-based procurement ERP that digitizes the complete purchasing workflow:

`product catalog -> RFQ creation -> per-item vendor invitation -> quotation submission -> best-quote comparison -> manager approval -> vendor-wise purchase orders -> delivery tracking -> invoice -> payment tracking`

The system provides four role-based workspaces: Admin, Manager, Officer, and Vendor. Internal users manage operations, approvals, reports, and audit visibility. Vendors only see RFQs, quotations, purchase orders, invoices, and notifications linked to their own vendor record.

## 4. Key Users

- Admin: manages internal users, account access, product catalog, vendor categories, password reset requests, system setup, and audit visibility.
- Manager: supervises procurement, manages vendor master data, reviews reports, approves or rejects procurement requests, and monitors payments.
- Officer: creates RFQs from catalog products, assigns vendors per RFQ item, compares quotations, recommends item-vendor selections, generates purchase orders, confirms received deliveries, generates invoices, and coordinates delivery.
- Vendor: views assigned RFQs, submits quotations, downloads purchase orders/invoices, and updates delivery progress for their own records.

## 5. Core Features in Main Branch

- Secure login with JWT authentication and role-based navigation.
- Public vendor signup that creates vendor-role users only.
- Forgot-password and reset-password flow with secure reset links.
- In-app password reset request workflow where users request help and Admin approves/rejects the request.
- Login alert, welcome, password reset, account deactivation, purchase order, and invoice emails through Brevo.
- Admin employee management with create, edit, status update, password update, and soft deactivation.
- Vendor management with categories, ratings, status, contact details, GST number, and optional vendor login creation.
- Product catalog with category, unit, active/inactive status, and default GST percent.
- Vendor categories with default GST percent and linked vendor/product counts.
- RFQ creation from catalog products with item-level quantity, due date, and per-item vendor assignment.
- RFQ send workflow with vendor notifications for assigned items.
- Vendor quotation submission with delivery days, GST-aware item pricing, commercial terms, and one quotation per RFQ/vendor.
- Per-item quotation comparison, lowest-price highlighting, and best-quote combination calculation.
- Manager approval workflow for selected item-vendor combinations before purchase order generation.
- Purchase order generation from approved selections, split by vendor where multiple vendors win different RFQ items.
- Delivery tracking through `PENDING`, `SHIPPED`, `ON_THE_WAY`, `DELIVERED`, and `RECEIVED`.
- Invoice generation from purchase orders, including automatic invoice generation when delivered goods are marked received.
- Email delivery for purchase orders and invoices.
- Role-specific dashboards, quick actions, notifications, and activity logs.
- Reports for monthly spend, vendor performance, RFQ status summary, pending approvals, and CSV procurement export.
- Backend validation with express-validator across users, vendors, categories, products, RFQs, quotations, approvals, purchase orders, invoices, payment status, and email recipients.
- Swagger/OpenAPI documentation at `/api-docs`.

## 6. What Makes It Useful

odooForce reduces manual procurement work and improves control. It ensures vendors cannot see competing quotations, manager approval is enforced before purchase order generation, item-level award decisions are traceable, purchase order and invoice totals derive from source records, and every important workflow action is auditable.

For a hackathon demo, the project is strong because it is more than a UI mockup. It has backend authorization, database models, validation, workflow state transitions, email integration, PDF generation, audit logs, notifications, dashboards, reports, and role-specific views.

## 7. Odoo Relevance

The idea aligns with ERP-style business operations that Odoo commonly supports: purchasing, vendor management, approvals, documents, invoicing, reporting, and operational dashboards. odooForce can be presented as a focused procurement module concept inspired by real ERP workflows.

It could later be adapted as:

- an Odoo procurement extension,
- a vendor portal module,
- an approval workflow module,
- a purchasing and accounting bridge,
- or an external procurement system integrated with Odoo purchase and accounting modules.

## 8. System Architecture

Frontend:

- React with Vite.
- Role-based navigation and dashboards.
- Product selection workflow for RFQ creation.
- Shared Axios client for API calls.
- Dense operational ERP interface for repeated business use.
- Charts for monthly spend and report views.
- Purchase order delivery progress views.

Backend:

- Express API.
- Prisma ORM.
- PostgreSQL database.
- JWT authentication.
- Role authorization middleware.
- Request validation middleware.
- Services for email, activity logs, notifications, numbering, and PDFs.
- Swagger/OpenAPI documentation.

Database:

- Users and role definitions.
- Vendors and vendor categories.
- Product catalog.
- RFQs, RFQ items, RFQ-level invites, and item-level vendor assignments.
- Quotations and quotation items.
- Approval requests with selected item-vendor combinations.
- Purchase orders and purchase order items.
- Deliveries with delivery status lifecycle.
- Invoices and invoice items.
- Notifications, activity logs, password reset requests, email logs, and attachments.

External services:

- Brevo Email API for transactional emails.
- Browser PDF streaming for purchase orders and invoices.

## 9. Security and Data Isolation

- Protected routes require JWT authentication.
- Restricted actions use backend role authorization.
- Vendors can access only assigned RFQs.
- Vendors can access only their own quotations, purchase orders, deliveries, invoices, and notifications.
- Vendors cannot see competing quotations or internal reporting.
- Passwords are hashed with bcrypt.
- Password hashes are removed from API responses.
- Public signup creates only vendor-role users.
- Password reset requests are reviewed by Admin before admin-driven password resets are sent by email.
- Admin and internal user accounts are created by authorized internal users.
- Sensitive provider errors and secrets are not exposed to users.
- Email failures are logged safely in email logs.
- Password reset links are delivered by email and reset tokens are not logged.
- CORS, Helmet, and rate limiting are preserved.

## 10. Business Rules

- A vendor can submit only one quotation per RFQ.
- A quotation must price every RFQ item assigned to that vendor.
- Quotations cannot be submitted after the RFQ deadline or once the workflow locks them.
- Only officers can create/send RFQs, compare quotations, recommend item-vendor selections, generate purchase orders, confirm received deliveries, and generate invoices.
- Only managers approve or reject approval requests and monitor payment status.
- A purchase order cannot be generated without manager approval.
- An invoice cannot be generated without a purchase order.
- Purchase orders may be split by vendor when the approved selection awards different items to different vendors.
- Purchase order totals derive from the approved selected quotation items.
- Invoice totals derive from the purchase order.
- Major workflow actions create activity logs.
- Important workflow transitions create notifications.
- Business document numbers use readable formats: `RFQ-YYYY-NNNN`, `QUO-YYYY-NNNN`, `PO-YYYY-NNNN`, and `INV-YYYY-NNNN`.

## 11. Demo Flow

1. Login as Admin.
2. Create or edit an internal user.
3. Create a vendor category with default GST.
4. Create products in the catalog.
5. Create a vendor with login access.
6. Login as Officer.
7. Create an RFQ by selecting products, setting quantities, and assigning vendors per item.
8. Send the RFQ and show vendor notification.
9. Login as Vendor.
10. View assigned RFQ items and submit a complete quotation.
11. Login as Officer.
12. Compare quotes per item, calculate the best quote combination, and submit selected items for approval.
13. Login as Manager.
14. Approve or reject the selected item-vendor combination.
15. Login as Officer.
16. Generate vendor-wise purchase orders.
17. Login as Vendor and advance delivery status.
18. Login as Officer and mark delivered goods as received.
19. Download/send purchase order and invoice PDFs.
20. Show payment status, dashboards, reports, activity logs, notifications, password reset requests, and CSV export.

## 12. Innovation Scope

The project focuses on practical automation rather than decorative dashboards. Its value is in connecting the procurement chain into one reliable workflow with vendor isolation, manager approval controls, business document generation, validation, reporting, and auditable transitions.

Potential extensions:

- AI-assisted vendor recommendation.
- OCR-based invoice upload.
- Odoo module integration.
- Vendor performance scoring improvements.
- Budget threshold approval rules.
- Multi-company procurement.
- Exportable compliance reports.
- Better budget-aware best-quote optimization across price, delivery, tax, and supplier performance.

## 13. Tech Stack

- React
- Vite
- Express.js
- Prisma
- PostgreSQL
- JWT
- bcrypt
- Brevo Email API
- PDFKit
- Recharts
- Lucide React
- Swagger/OpenAPI

## 14. Expected Impact

odooForce can help organizations:

- reduce procurement cycle time,
- avoid manual spreadsheet errors,
- enforce approval discipline,
- improve vendor communication,
- centralize purchase documents,
- maintain a reliable audit trail,
- and protect vendor-sensitive data.

## 15. Hackathon Submission Summary

odooForce is a role-based procurement ERP that transforms fragmented purchasing into a secure, auditable, end-to-end workflow. It is designed around four users: Admin, Manager, Officer, and Vendor. The current main branch includes authentication, validation, password reset requests, vendor management, product catalog, per-item RFQs, quotations, best-quote selection, approvals, vendor-wise purchase orders, delivery tracking, invoices, emails, PDFs, reports, notifications, and activity logs.

The project is suitable for the Odoo Hackathon because it demonstrates a real ERP use case, clear business value, and a working technical implementation that can evolve into an Odoo procurement/vendor portal module.
