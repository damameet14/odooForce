# Reports & Analytics

## Wireframe

```text
Header: Reports & Analytics | Schedule Report
Analytics grid:
Spend Trend | RFQ Funnel | Approval Turnaround | Category Spend
Secondary analytics:
Vendor Performance | Monthly Procurement | Savings | Exceptions
```

## UX Rationale

Reports move VendorBridge from record management to operational intelligence. The analytics focus on procurement spend, funnel conversion, vendor performance, and approval delays.

## Component Hierarchy

- Page header
- Chart card grid
- Spend trend chart
- Vendor performance chart
- RFQ funnel chart
- Approval turnaround widget
- Category spending table
- Export and schedule actions

## Layout Specification

Use a four-card grid on wide screens and stack on smaller screens. The first row should answer executive questions quickly: spend, funnel, turnaround, and category concentration.

## Interaction Notes

Filters should support date range, category, vendor, status, and department when available. Reports must not expose organization-wide data to vendor users.
