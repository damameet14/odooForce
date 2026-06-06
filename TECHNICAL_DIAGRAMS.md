# odooForce Technical Diagrams

Professional technical views for the current main branch of the OdooForce procurement ERP.

Open [TECHNICAL_DIAGRAMS.html](TECHNICAL_DIAGRAMS.html) in a browser for a presentation-ready visual version.

## 1. Four-User Role Model

```mermaid
flowchart LR
  Admin["Admin<br/>Users, products, categories, reset requests"] --> Platform["OdooForce ERP Platform"]
  Manager["Manager<br/>Vendor oversight, approvals, reports, payments"] --> Platform
  Officer["Officer<br/>Catalog RFQs, item awards, POs, invoices, delivery receipt"] --> Platform
  Vendor["Vendor<br/>Assigned RFQs, own quotations, own POs/invoices"] --> Platform

  Platform --> Isolation["Backend authorization + vendor isolation"]
  Isolation --> Workflow["Auditable catalog-to-invoice workflow"]

  classDef role fill:#e8f4ff,stroke:#2563eb,color:#102a43
  classDef core fill:#edf7f4,stroke:#e85a4f,color:#123c3a
  classDef guard fill:#fff7e6,stroke:#b7791f,color:#4a3200
  class Admin,Manager,Officer,Vendor role
  class Platform,Workflow core
  class Isolation guard
```

## 2. System Architecture

```mermaid
flowchart TB
  subgraph Client["Client Layer"]
    Browser["Browser"]
    Frontend["React + Vite SPA<br/>Role dashboards, forms, tables, reports"]
    Browser --> Frontend
  end

  subgraph Api["API Layer - Express"]
    Routes["Routes + Swagger<br/>/api, /api-docs"]
    Security["Security Middleware<br/>Helmet, CORS, rate limit"]
    Auth["JWT Auth + RBAC<br/>protect + authorize(...)"]
    Validation["Request Validation<br/>express-validator"]
    Controllers["Controllers<br/>auth, master data, products, RFQ, workflow, reports"]
  end

  subgraph Domain["Domain Services"]
    Activity["Activity Log Service"]
    Notify["Notification Service"]
    Numbering["Document Numbering<br/>RFQ/QUO/PO/INV"]
    Pdf["PDF Service<br/>PO and invoice streaming"]
    Email["Email Service<br/>Brevo + EmailLog"]
    Templates["Email Templates<br/>welcome, login, reset, PO, invoice"]
  end

  subgraph Data["Data Layer"]
    Prisma["Prisma ORM"]
    Postgres[("PostgreSQL<br/>Business records and audit data")]
  end

  subgraph External["External Providers"]
    Brevo["Brevo Email API"]
  end

  Frontend -->|"Axios / JSON / Bearer token"| Routes
  Routes --> Security --> Auth --> Validation --> Controllers
  Controllers --> Activity
  Controllers --> Notify
  Controllers --> Numbering
  Controllers --> Pdf
  Controllers --> Email
  Email --> Templates
  Controllers --> Prisma
  Activity --> Prisma
  Notify --> Prisma
  Numbering --> Prisma
  Email --> Prisma
  Email --> Brevo
  Prisma --> Postgres

  classDef client fill:#e8f4ff,stroke:#2563eb,color:#102a43
  classDef api fill:#edf7f4,stroke:#e85a4f,color:#123c3a
  classDef service fill:#fff7e6,stroke:#b7791f,color:#4a3200
  classDef data fill:#f3edff,stroke:#6d28d9,color:#2e1065
  classDef external fill:#fff1f2,stroke:#be123c,color:#4c0519
  class Browser,Frontend client
  class Routes,Security,Auth,Validation,Controllers api
  class Activity,Notify,Numbering,Pdf,Email,Templates service
  class Prisma,Postgres data
  class Brevo external
```

## 3. Procurement Workflow and Control Points

```mermaid
flowchart LR
  Admin(["Admin"]) --> Users["Users, products, categories<br/>Password reset requests"]
  Manager(["Manager"]) --> VendorMaster["Vendor oversight<br/>Reports + payments"]
  Officer(["Officer"]) --> Draft["Create RFQ from products<br/>Quantity + per-item vendors"]

  Draft --> SendGate{"Valid RFQ?<br/>Active products + quantity + item vendors"}
  SendGate -->|No| ValidationError["422 validation error"]
  SendGate -->|Yes| Sent["Send RFQ<br/>Notify vendors for assigned items"]

  Vendor(["Vendor"]) --> Assigned{"RFQ assigned<br/>to vendorId?"}
  Sent --> Assigned
  Assigned -->|No| Forbidden["403 forbidden"]
  Assigned -->|Yes| Quote["Submit quotation<br/>Every item priced"]
  Quote --> QuoteGate{"Items assigned<br/>and workflow not locked?"}
  QuoteGate -->|No| Conflict["409 workflow conflict"]
  QuoteGate -->|Yes| Received["Quotation stored<br/>Unique RFQ + vendor"]

  Received --> Compare["Officer compares per-item quotes<br/>Price + GST + delivery"]
  Compare --> Best["Best-quote combination<br/>Cheapest valid vendor per item"]
  Best --> Select["Officer submits selected items"]
  Select --> Approval["Manager approval request"]
  Approval --> Decision{"Manager decision"}
  Decision -->|Rejected| Rejected["Rejected or revision required"]
  Decision -->|Approved| Approved["Approved"]
  Approved --> PO["Officer generates vendor-wise POs<br/>Totals from selected items"]
  PO --> Delivery["Delivery status tracking<br/>Pending to received"]
  Delivery --> Invoice["Invoice from PO<br/>Auto-generated on receipt"]
  Invoice --> Payment["Manager tracks payment status"]

  Users -.-> Audit["Activity logs"]
  VendorMaster -.-> Audit
  Sent -.-> Audit
  Quote -.-> Audit
  Select -.-> Audit
  Decision -.-> Audit
  PO -.-> Audit
  Invoice -.-> Audit
  Sent -.-> Notices["Notifications"]
  Quote -.-> Notices
  Approval -.-> Notices
  Decision -.-> Notices

  classDef actor fill:#e8f4ff,stroke:#2563eb
  classDef step fill:#edf7f4,stroke:#e85a4f
  classDef gate fill:#fff7e6,stroke:#b7791f
  classDef fail fill:#fff1f2,stroke:#be123c
  classDef audit fill:#f3edff,stroke:#6d28d9
  class Admin,Manager,Officer,Vendor actor
  class Users,VendorMaster,Draft,Sent,Quote,Received,Compare,Best,Select,Approval,Rejected,Approved,PO,Delivery,Invoice,Payment step
  class SendGate,Assigned,QuoteGate,Decision gate
  class ValidationError,Forbidden,Conflict fail
  class Audit,Notices audit
```

## 4. Data Model

```mermaid
erDiagram
  User ||--o| Vendor : "optional vendor login"
  VendorCategory ||--o{ Vendor : categorizes
  VendorCategory ||--o{ Product : groups
  Product ||--o{ RfqItem : selected_for
  User ||--o{ Rfq : creates
  Rfq ||--o{ RfqItem : contains
  RfqItem ||--o{ RfqItemVendor : assigned_to
  Vendor ||--o{ RfqItemVendor : receives_item
  Rfq ||--o{ RfqVendorInvite : invites
  Vendor ||--o{ RfqVendorInvite : receives
  Rfq ||--o{ Quotation : receives
  Vendor ||--o{ Quotation : submits
  Quotation ||--o{ QuotationItem : contains
  RfqItem ||--o{ QuotationItem : priced_by
  Rfq ||--o{ Approval : requests
  Quotation ||--o{ Approval : selected_for
  User ||--o{ Approval : requests
  User ||--o{ Approval : reviews
  Approval ||--o{ PurchaseOrder : unlocks_vendor_split
  Rfq ||--o{ PurchaseOrder : source
  Quotation ||--o{ PurchaseOrder : source
  Vendor ||--o{ PurchaseOrder : receives
  PurchaseOrder ||--o{ PurchaseOrderItem : contains
  PurchaseOrder ||--o| Delivery : tracked_by
  PurchaseOrder ||--o{ Invoice : generates
  Invoice ||--o{ InvoiceItem : contains
  Vendor ||--o{ Invoice : billed_to
  User ||--o{ ActivityLog : performs
  User ||--o{ Notification : receives
  User ||--o{ PasswordResetRequest : requests
  EmailLog }o--|| User : "records user email events"
```

## 5. API Sequence - RFQ to Invoice

```mermaid
sequenceDiagram
  autonumber
  actor A as Admin
  actor O as Officer
  actor V as Vendor
  actor M as Manager
  participant FE as React SPA
  participant API as Express API
  participant SVC as Services
  participant DB as PostgreSQL
  participant Mail as Brevo

  A->>FE: Create catalog/master data
  FE->>API: POST /api/users, /api/vendors, /api/products
  API->>API: Validate payload and role
  API->>DB: Store user/vendor data
  API->>SVC: Activity log and optional email

  O->>FE: Create RFQ from product catalog
  FE->>API: POST /api/rfqs
  API->>DB: Transaction: RFQ, product items, per-item vendors, invites
  FE->>API: POST /api/rfqs/:id/send
  API->>SVC: Notify assigned vendors + log

  V->>FE: Submit quotation
  FE->>API: POST /api/quotations
  API->>API: Verify vendor item assignment and complete item pricing
  API->>DB: Transaction: quotation, items, invite status, RFQ status
  API->>SVC: Notify officer + log

  O->>FE: Compare, calculate best quote, and recommend
  FE->>API: GET /api/rfqs/:id/quotations/compare
  FE->>API: POST /api/rfqs/:id/best-quote
  API->>DB: Read quotation items, GST, delivery, vendors
  API-->>FE: Best item-vendor combination
  FE->>API: POST /api/rfqs/:id/approve-selection
  API->>DB: Create approval request with selectedItems JSON
  API->>SVC: Notify manager + log

  M->>FE: Approve request
  FE->>API: PUT /api/approvals/:id/approve
  API->>DB: Transaction: approval and RFQ state
  API->>SVC: Notify officer + log

  O->>FE: Generate PO and invoice
  FE->>API: POST /api/purchase-orders/generate
  API->>DB: Create vendor-wise POs from approved selected items
  FE->>API: GET /api/purchase-orders/:id/pdf
  API->>SVC: Stream purchase order PDF
  V->>FE: Advance delivery
  FE->>API: PUT /api/purchase-orders/:id/status
  API->>DB: Update delivery status
  O->>FE: Mark received
  FE->>API: PUT /api/purchase-orders/:id/status
  API->>DB: Mark RECEIVED and create invoice from PO totals
  FE->>API: POST /api/invoices/:id/email
  API->>SVC: Build email from template
  SVC->>Mail: Send document email
  SVC->>DB: Email log
```

## 6. Security, Validation, and Isolation Model

```mermaid
flowchart TB
  Request["Incoming API request"] --> Token{"Valid JWT?"}
  Token -->|No| Unauth["401 Unauthorized"]
  Token -->|Yes| Role{"Role allowed?"}
  Role -->|No| Forbidden["403 Forbidden"]
  Role -->|Yes| Validate{"Payload valid?"}
  Validate -->|No| Invalid["422 Validation error"]
  Validate -->|Yes| VendorCheck{"Vendor-facing record?"}
  VendorCheck -->|No| Business["Business rule checks"]
  VendorCheck -->|Yes| Ownership{"req.user.vendorId owns<br/>RFQ invite / quotation / PO / invoice?"}
  Ownership -->|No| Forbidden
  Ownership -->|Yes| Business
  Business --> State{"Workflow state valid?"}
  State -->|No| Conflict["409 Conflict"]
  State -->|Yes| Tx["Prisma transaction"]
  Tx --> Data["State change"]
  Tx --> Audit["Activity log"]
  Tx --> Notification["Notification"]
  Tx --> Response["200/201/204 response"]
```

## 7. Feature Surface

| Area | Main branch capability |
| --- | --- |
| Authentication | Login, logout, current user, public vendor signup, forgot password, reset password |
| User management | Create/update internal users, password update, status update, soft deactivation, reset request review |
| Product catalog | Products with category, unit, default GST, active/inactive status |
| Vendor management | Categories with default GST, vendor profiles, rating, status, GST, optional login creation |
| RFQs | Create from catalog products, assign vendors per item, send, list visible RFQs |
| Quotations | Vendor submission for assigned items, GST-aware pricing, delivery days, ranked comparison |
| Best quote | Cheapest valid item-vendor combination and manual override before approval |
| Approvals | Approval queue, selectedItems review, approve, reject, revision request |
| Purchase orders | Generate vendor-wise POs from approved selected items, status updates, PDF, email |
| Deliveries | Delivery lifecycle from PENDING to RECEIVED, with invoice creation on receipt |
| Invoices | Generate from PO, payment status update, PDF, email |
| Reporting | Dashboard summary, monthly spend, vendor performance, RFQ summary, pending approvals, CSV export |
| Auditability | Activity logs, notifications, email logs |

## 8. Four-User Access Matrix

| Capability | Admin | Manager | Officer | Vendor |
| --- | --- | --- | --- | --- |
| Manage internal users and access | Yes | Limited oversight | No | Password reset request |
| Manage product catalog | Yes | Review | Read | No |
| Manage vendors and categories | Yes | Yes | Read vendors | No |
| Create, edit, and send catalog RFQs | No | Review | Yes | No |
| View RFQs | All | All | Operational RFQs | Assigned only |
| Submit quotations | No | No | No | Own assigned RFQs only |
| See competing vendor quotations | Yes | Yes | Yes | No |
| Recommend selected item-vendor combination | No | Review | Yes | No |
| Approve or reject approval request | No | Yes | No | No |
| Generate vendor-wise purchase orders | No | Review | Yes | No |
| Update delivery status | Oversight | Oversight | Internal statuses | Own delivery progress |
| Generate invoices | No | Review | Yes | No |
| Update payment status | No | Yes | No | No |
| View reports and exports | Yes | Yes | Limited operational views | No |
| View own notifications/documents | Yes | Yes | Yes | Own records only |
