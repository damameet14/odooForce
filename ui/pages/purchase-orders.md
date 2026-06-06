# Purchase Orders

## Wireframe

```text
Header: Purchase Orders | Generate PO
Main: PO lifecycle | item breakdown table
Side: vendor details | tax summary | delivery tracking
```

## UX Rationale

The PO experience connects the selected quotation to fulfillment. Users can see lifecycle state, vendor readiness, line-item cost, tax, total, and delivery progress in one view.

## Component Hierarchy

- Page header
- PO lifecycle workflow
- Item breakdown table
- Vendor summary card
- Tax and total summary
- Delivery progress component

## Layout Specification

Use a wide detail card for PO lifecycle and items, with a side summary card for vendor and financial totals. The item table should remain dense and printable.

## Interaction Notes

PO generation is procurement-only and must only be available when the selected quotation has an approved finance approval. Totals must derive from source quote records, not editable UI values.
