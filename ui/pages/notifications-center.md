# Notifications Center

## Wireframe

```text
Header: Notifications Center | Mark All Read
Toolbar: search | urgency | workflow | read state
Notification rows: severity | message | context | status/action
```

## UX Rationale

Notifications become useful when grouped by urgency and workflow. Users should be able to distinguish approval blockers, quote arrivals, PO updates, delivery issues, and invoice risks at a glance.

## Component Hierarchy

- Page header
- Notification filters
- Notification list
- Severity indicators
- Workflow badges
- Read state and action affordance

## Layout Specification

Use a full-width list card. Each notification row uses a narrow severity bar, a concise message, a muted context line, and a state badge.

## Interaction Notes

Notifications are role-aware. Vendors only receive and access their own RFQ, quote, PO, delivery, invoice, and notification records. Important workflow transitions should later create notifications transactionally with the underlying state change.
