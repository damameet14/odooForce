# Odoo Force UI Redesign Package

This directory contains a standalone design and documentation package for the VendorBridge procurement ERP redesign. It intentionally does not modify the production frontend, backend, database, API, migrations, package manifests, routes, or business logic.

## Contents

- `redesign/index.html` - static SaaS-grade ERP prototype
- `design-system/` - color, typography, spacing, component style rules
- `pages/` - page-level wireframes and UX specifications
- `components/` - reusable component specifications
- `documentation/` - implementation notes and integration guidance

## Review

Open `ui/redesign/index.html` in a browser to inspect the static prototype.

## Boundary

All files in this package are design artifacts. They are not wired to live VendorBridge APIs, routes, authentication, Prisma models, or business workflows.
