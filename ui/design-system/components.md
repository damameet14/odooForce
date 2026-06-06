# Odoo Force Component Style Guide

## Buttons

Primary buttons use coral fill, white text, 8px radius, and a soft coral action shadow. Use only for decisive workflow actions such as Create RFQ, Recommend Quote, Send To Approval, Generate PO, or Schedule Report.

Secondary buttons use white fill, navy text, warm border, and no shadow. Ghost buttons are transparent and reserved for utility actions such as export or configure view.

## Cards

Cards use white surfaces, `color.border`, 8px radius, and `shadow.card`. Cards should not be nested inside other cards. Use cards for discrete ERP objects: KPI, workflow panel, table container, scorecard, recommendation, or timeline module.

## Tables

Every table includes:

- search
- filters
- sorting affordance
- pagination summary
- bulk action entry point
- export action
- dense row height using 13px table text

Headers use uppercase 11px metadata text on a warm near-white background. Rows use clear status badges and right-sized actions instead of large decorative controls.

## Badges

Badges are pill-shaped and state-driven. Use:

- blue for sent, submitted, informational states
- coral for active procurement attention
- amber for pending, due soon, needs review
- green for approved, paid, complete
- red for rejected, overdue, breach
- gray for draft, inactive, neutral

## Forms And Filters

Filters are compact 8px radius controls aligned in a toolbar above tables. Use one-line labels like `Status: Active`, `Deadline: Next 30 days`, and `Sort: Amount`.

Forms should be split by procurement intent: RFQ details, item lines, vendor invitation, terms, attachments, and review. Avoid long ungrouped forms.

## Tabs And Page Navigation

Use tabs for object detail screens where users move between Overview, Items, Vendors, Quotes, Approvals, Activity, and Documents. Keep the first tab operational, not descriptive.

## Charts

Charts use restrained fills and operational labels. Spend and RFQ funnel charts may use coral gradients. Status distribution should use mapped workflow colors. Never rely on color alone; pair visual state with labels.

## Modals

Modals are used only for focused confirmations or short workflow decisions:

- approve
- reject
- request changes
- send RFQ
- generate PO
- email invoice

Long workflows should use full pages or side panels instead of modals.
