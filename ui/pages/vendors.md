# Vendors

## Wireframe

```text
Header: Vendors | Invite Vendor
Toolbar: search | category filter | risk filter | lifecycle filter | bulk action | export
Table: vendor | category | lifecycle | score | risk | spend | open RFQs | actions
Pagination
```

## UX Rationale

Vendor lifecycle management needs more than contact records. The table foregrounds readiness, risk, score, spend, and open procurement exposure so procurement teams can quickly decide who to invite, review, suspend, or prioritize.

## Component Hierarchy

- Page header
- Advanced table toolbar
- Vendor directory table
- Status badges
- Score and risk indicators
- Pagination

## Layout Specification

Use a full-width table card with compact filters. Vendor name remains the first sticky scan target. Lifecycle, score, and risk should be visible without opening the record.

## Interaction Notes

Search covers vendor name, category, contact, and tax identifier. Bulk actions support category assignment, review request, activate, suspend, and export. Vendor users must never see other vendor records.
