# Invoices

## Wireframe

```text
Header: Invoices | Export Aging
Toolbar: search | payment filter | due filter | PDF | print | email | export
Table: invoice | PO | vendor | amount | due date | payment | risk | actions
```

## UX Rationale

Invoice management should make payment risk visible. Overdue and open invoices are prioritized, with document actions available directly in the table toolbar.

## Component Hierarchy

- Page header
- Invoice action toolbar
- Invoice table
- Payment status badges
- Overdue indicators
- Export and document actions

## Layout Specification

Use a full-width table with due date and payment status near the middle of the row. Document actions remain in the toolbar for batch work and in each row for single-invoice operations.

## Interaction Notes

PDF export, print, and email are UI proposals only. Finance users can update payment status. Invoices cannot be generated without a purchase order, and invoice totals must derive from PO source records.
