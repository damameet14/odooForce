# Quotation Comparison

## Wireframe

```text
Header: Quotation Comparison | Recommend selected vendor
Toolbar: RFQ selector | sort | compliant-only filter | export matrix
Left: side-by-side matrix
Right: recommendation card with reasons and send-to-approval action
```

## UX Rationale

This is the strongest ERP experience in the redesign. The page lets procurement compare bids by price, delivery, vendor score, compliance, and commercial terms without opening separate records.

## Component Hierarchy

- Page header
- Comparison toolbar
- Matrix grid
- Best-value highlights
- Recommendation card
- Finance submission action

## Layout Specification

Use a two-column layout. The comparison matrix receives the wider column. The recommendation card stays visible beside it and summarizes why the suggested vendor is preferred.

## Interaction Notes

Lowest price and fastest delivery are highlighted independently because they may belong to different vendors. Sorting supports price, delivery, score, compliance, and weighted recommendation. Vendor users must never access this page because it exposes competing quotations.
