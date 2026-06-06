# Dashboard

## Wireframe

```text
Top bar: global search | export | configure view | create RFQ
Sidebar: Dashboard, Vendors, RFQs, Quotations, Comparison, Approvals, POs, Invoices, Reports

Page title: Procurement Command Center
KPI strip: Active RFQs | Quotations Received | Pending Approvals | POs | Open Invoices | Spend
Main row: Procurement Pipeline | Quick Actions
Lower row: Spend Trend | Vendor Performance | Recent Activity
```

## UX Rationale

The dashboard makes workflow status visible immediately instead of hiding procurement work inside CRUD lists. The KPI strip is compact and scan-first. The pipeline shows where work is blocked, while quick actions route users to the next operational task.

## Component Hierarchy

- App shell
- Top app bar
- KPI card grid
- Procurement pipeline panel
- Quick action panel
- Chart panel
- Vendor performance table
- Recent activity timeline

## Layout Specification

Use a two-column desktop layout below the KPI strip. The pipeline gets the wider column because it is the primary operational object. On tablet and mobile, cards stack in workflow priority order.

## Interaction Notes

KPI cards link to filtered lists. Pipeline stages open matching RFQ filters. Quick actions are role-aware: Procurement users see RFQ and comparison actions, Finance users see approval actions, Vendor users see only their own submissions and notifications.
