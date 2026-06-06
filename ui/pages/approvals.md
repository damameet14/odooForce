# Approvals

## Wireframe

```text
Header: Approval Management | Export Queue
Left: approval queue table
Right: approval workflow visualization and timeline
Actions: approve | reject | request changes
```

## UX Rationale

Finance decisions need context, not just a pending status. The page combines queue pressure, RFQ and vendor context, SLA timing, and workflow history so finance can approve or reject with confidence.

## Component Hierarchy

- Page header
- Approval queue table
- Priority and SLA badges
- Workflow visualization
- Approval timeline
- Decision actions

## Layout Specification

Use a two-column layout. The queue is the primary panel. The right panel updates to show details for the selected approval and keeps the workflow path visible.

## Interaction Notes

Approve, reject, and request changes are finance-only actions. Rejection and change requests require a reason. Approval decisions should later be wired as transactional workflow actions with activity logs and notifications.
