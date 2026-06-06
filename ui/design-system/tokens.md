# Odoo Force Design Tokens

## Color

The palette takes the uploaded "Minimal Yet Warm" reference and hardens it for procurement operations.

| Token | Value | Usage |
| --- | --- | --- |
| `color.warm.50` | `#F8F6EF` | App shell, page background |
| `color.warm.100` | `#EAE7DC` | Warm panels, secondary surfaces |
| `color.sand.200` | `#D8C3A5` | Subtle dividers, inactive fills |
| `color.stone.500` | `#8E8D8A` | Muted text, disabled controls |
| `color.coral.400` | `#E98074` | Hover accent, chart highlight |
| `color.coral.600` | `#E85A4F` | Primary action, urgent workflow |
| `color.navy.900` | `#17233C` | Navigation, headings |
| `color.navy.700` | `#263653` | Body emphasis, secondary buttons |
| `color.blue.500` | `#2878D7` | Informational status |
| `color.green.600` | `#1F8A5B` | Success, approved, paid |
| `color.amber.500` | `#C78213` | Pending, warning, due soon |
| `color.red.600` | `#C83D35` | Overdue, rejected, breach |
| `color.white` | `#FFFFFF` | Cards and table rows |
| `color.border` | `#DED8CA` | Borders on warm surfaces |

## Typography

Use Inter or Segoe UI as the preferred stack: `Inter, "Segoe UI", Arial, sans-serif`.

| Token | Size | Weight | Usage |
| --- | ---: | ---: | --- |
| `type.display` | 28px | 800 | Rare page-level hero labels |
| `type.page` | 24px | 800 | Page titles |
| `type.section` | 18px | 750 | Card and section titles |
| `type.subsection` | 14px | 750 | Dense panel titles |
| `type.body` | 14px | 500 | Default UI text |
| `type.table` | 13px | 500 | Table rows |
| `type.meta` | 12px | 650 | Labels, helper text, timestamps |
| `type.micro` | 11px | 750 | Table headers, nav section labels |

Letter spacing stays at `0` for readability. Use uppercase only for dense labels and table headers.

## Spacing

| Token | Value | Usage |
| --- | ---: | --- |
| `space.1` | 4px | Tight icon gaps |
| `space.2` | 8px | Control gaps, badge padding |
| `space.3` | 12px | Table cell rhythm |
| `space.4` | 16px | Card padding |
| `space.5` | 20px | Section spacing |
| `space.6` | 24px | Page gutters |
| `space.8` | 32px | Major page group spacing |

## Shape, Shadow, And Layering

| Token | Value | Usage |
| --- | --- | --- |
| `radius.control` | `8px` | Buttons, inputs, cards |
| `radius.badge` | `999px` | Status badges |
| `shadow.card` | `0 16px 38px rgba(23, 35, 60, .10)` | Elevated cards |
| `shadow.action` | `0 10px 22px rgba(232, 90, 79, .20)` | Primary action buttons |
| `z.topbar` | `10` | Sticky top bar |
| `z.modal` | `100` | Dialogs and overlays |

## Status Mapping

| Workflow State | Badge Color |
| --- | --- |
| Draft, inactive | Gray |
| Sent, submitted, info | Blue |
| Quotes received, primary attention | Coral |
| Approval pending, due soon | Amber |
| Approved, paid, complete | Green |
| Rejected, overdue, SLA breach | Red |

## Brand Asset

Use the Odoo Force transparent PNG logo from `ui/redesign/assets/odoo-force-logo.png` for prototype branding. The mark should sit on dark navy or white surfaces with at least 8px clear space, no distortion, and no recoloring. On the dark sidebar, place it inside a subtle translucent tile so the coral and warm highlights stay crisp against `color.navy.900`.
