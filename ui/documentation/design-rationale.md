# Design Rationale

## Direction

The redesign positions VendorBridge as a modern procurement ERP named Odoo Force. The visual direction is "minimal yet warm": warm neutrals from the reference image, coral emphasis, enterprise navy structure, and operational status colors.

The sidebar and favicon use the uploaded Odoo Force logo as the primary brand signal. The logo's coral and warm highlights are paired with the reference palette so the product feels connected to the procurement workflow rather than pasted onto it.

## Experience Goals

- Make procurement workflows visible without drilling into records.
- Reduce whitespace while keeping a premium, calm interface.
- Surface blocked work, pending approvals, overdue invoices, and quote readiness.
- Make comparison and approval workflows feel first-class.
- Keep every table dense, filterable, sortable, exportable, and safe while loading.

## Information Hierarchy

The dashboard starts with business outcomes: spend, RFQs, quotes, approvals, POs, and invoices. Pages then move from summary to action: filters, workflow state, table rows, and row-level decisions.

## Enterprise Fit

The design avoids marketing composition, oversized hero content, decorative sections, and isolated CRUD cards. It prioritizes scan speed, workflow visibility, auditability, and clear role boundaries.

## Hackathon Context

The hackathon problem statement and Excalidraw mockup emphasize a complete procurement path: login/signup, dashboard monitoring, vendor management, RFQ creation, vendor quotation submission, quotation comparison, approval workflow, purchase order and invoice generation, activity logs, notifications, and reports. The static prototype keeps those modules visible as separate selectable sections while leaving production implementation to a future frontend/backend change.
