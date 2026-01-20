# Release 0.0.8

## Collection-Scoped Search

Added intelligent search scoping for monorepo structures to improve performance and prevent false matches:

- **Files in `lib/<collection>/`** (e.g., `lib/documents/addon/components/foo.js`) now only search within that specific collection
- **Files in `packages/<collection>/`** (e.g., `packages/charting/src/components/bar.ts`) search within the collection and related test directories:
  - `packages/<collection>/`
  - `tests/acceptance/<collection>/`
  - `tests/integration/<collection>/`
- **Files in other locations** (e.g., `app/`, `src/`) maintain the original broad search behavior

## Performance Improvements

- Improved search performance by limiting scope when working within collections
- Prevents cross-collection matches in large monorepo structures
- Faster results when working within a specific collection

## Installation

Download `ember-related-files-hopper-0.0.8.vsix` and install via VS Code Extensions (Install from VSIX).
