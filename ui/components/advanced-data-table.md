# Advanced Data Table

## Purpose

All entity lists use the same dense table system so procurement users can scan and operate quickly.

## Required Controls

- search
- filters
- sorting
- pagination
- bulk actions
- export
- column density control when implemented

## Anatomy

- toolbar
- table header
- table body
- status badges
- row actions
- pagination footer

## Behavior

Search and filters should preserve state in the URL when implemented. Row actions are role-aware and state-aware. Bulk actions must validate permissions server-side in the eventual app implementation.
