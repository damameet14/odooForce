# RFQs

## Wireframe

```text
Header: RFQ Management | Create RFQ
Workflow: Draft -> Sent -> Quotes Received -> Approval Pending -> Approved -> PO Generated
Toolbar: search | status | deadline | owner | bulk send | export
Table: RFQ ID | title | value | vendors | quotes | deadline | status | progress | actions
Pagination
```

## UX Rationale

RFQs become easier to manage when the status flow is visible at the top of the page. The table is designed for deadline pressure, quote readiness, and workflow completion rather than simple record browsing.

## Component Hierarchy

- Page header
- Workflow visualization
- Advanced table toolbar
- RFQ data table
- Progress bars
- Status badges
- Pagination

## Layout Specification

The status flow sits above the table and spans the full width. Each RFQ row includes both status and progress so users can see the current state and the overall lifecycle position.

## Interaction Notes

Row actions change by state: draft can edit/send, sent can monitor vendors, quotes received can compare, approval pending opens approval details, approved can generate PO. Vendor access must be limited to assigned RFQs only.
