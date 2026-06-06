# Activity Timeline

## Wireframe

```text
Header: Activity Timeline | Export Audit Log
Toolbar: search | object type | actor | date range
Timeline rows: severity dot | action summary | metadata preview | timestamp
```

## UX Rationale

The audit trail is core to procurement governance. A dedicated timeline gives operators a fast way to inspect major workflow changes and state transitions without digging through individual records.

## Component Hierarchy

- Page header
- Timeline filter toolbar
- Activity event rows
- Severity dots
- Metadata preview
- Export action

## Layout Specification

Use a single-column timeline with compact rows. Metadata previews should be short and safe: record numbers, workflow state, actor, and non-sensitive context only.

## Interaction Notes

Search should cover record numbers, actor names, action labels, and workflow objects. Metadata must never include passwords, tokens, credentials, or sensitive request bodies.
