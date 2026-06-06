# Implementation Notes

## Scope Boundary

This redesign package is intentionally limited to `ui/`. It documents the proposed SaaS-grade ERP experience without changing the current React frontend, Express backend, Prisma schema, routes, migrations, packages, or environment files.

Future implementation should be handled as a separate engineering task with normal review, tests, and authorization checks.

## Hackathon Problem Statement Alignment

The static prototype is aligned to the submitted hackathon flow: authenticated role-based access, dashboard monitoring, vendor records, RFQ creation, quotation submission, side-by-side comparison, approval workflow, PO/invoice generation, printable/email-ready invoices, activity tracking, notifications, and reports. Any missing production behavior should be implemented through the real frontend and backend in a separate change, not inside this design artifact.

## Suggested Frontend Integration Path

1. Create React components that mirror the documented component specs.
2. Use the existing shared Axios client in `frontend/src/api/client.js`.
3. Preserve the existing authentication state through `useAuth`.
4. Use existing `useLoad` and `useList` patterns for object and array loading.
5. Replace current screens incrementally, starting with Dashboard, RFQs, Quotations, and Approvals.
6. Keep all workflow actions backed by existing backend authorization and business rules.

## Role-Aware UX Requirements

- Vendors may only see RFQs assigned to their linked vendor record.
- Vendors may only see their own quotations, POs, deliveries, invoices, and notifications.
- Vendors must never see quotation comparison matrices or competing vendor bids.
- Procurement-only actions include RFQ creation/sending, quotation comparison, recommendation, PO generation, and invoice generation.
- Finance-only actions include approval decisions and invoice payment updates.
- Admin-only account creation should remain separate from public vendor signup.

## Workflow Requirements To Preserve

- RFQ status flow: Draft -> Sent -> Quotes Received -> Approval Pending -> Approved -> PO Generated.
- Vendor quote submission must allow at most one quotation per RFQ.
- Quotations must price every RFQ item.
- Quotations cannot be accepted after deadline or once approval workflow locks them.
- PO generation must require an approved finance approval.
- Invoice generation must require a purchase order.
- PO and invoice totals must derive from source records.

## Audit And Notification Requirements

Future implementation should create activity logs and notifications for major actions:

- RFQ creation and sending
- quotation submission and selection
- approval request and finance decision
- PO generation and status changes
- invoice generation and payment changes
- delivery status changes

Workflow state changes, activity logs, and notifications should be committed in one backend transaction.

## API And Data Notes

The static prototype uses mock data. A production implementation should use existing endpoints where available and only propose new endpoints in a backend-specific change request. If new endpoints are needed, they should include Swagger documentation, request validation, `protect`, role authorization, and vendor ownership checks.

## Accessibility Notes

- Preserve visible text labels for table filters and workflow states.
- Do not rely on color alone for status.
- Keep focus states clear for buttons, filters, row actions, and navigation.
- Ensure tables remain horizontally scrollable on small screens.
- Keep typography compact but readable.
