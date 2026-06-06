# Quotations

## Wireframe

```text
Header: Quotations | Export Quotations
Toolbar: search | RFQ filter | compliance filter | sort | bulk shortlist | export
Table: quote ID | vendor | RFQ | amount | delivery | compliance | status | actions
Pagination and isolation note
```

## UX Rationale

The quotation inbox is optimized for procurement review. Users can quickly identify price, delivery promise, compliance status, and whether a quote should move to comparison.

## Component Hierarchy

- Page header
- Quotation table toolbar
- Quotation table
- Compliance badges
- Status badges
- Pagination

## Layout Specification

Use a full-width dense table. Amount and delivery columns should be sortable. Compliance badges should be visually stronger than neutral metadata because they affect recommendation eligibility.

## Interaction Notes

Procurement users can compare and shortlist submitted quotes. Vendor users only see their own quotation rows. A vendor cannot submit more than one quotation per RFQ, and all RFQ items must be priced before submission.
