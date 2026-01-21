# Ember Related Files Hopper 🚀

A lightning-fast way to navigate between related files in an Ember.js project. Whether you are using **Classic** or **Pods** structure, this extension helps you "hop" between templates, controllers, routes, and tests instantly.

## Features

-   **Smart Detection**: Automatically identifies the base entity (e.g., `user-profile`) regardless of which file you are currently in.
-   **Pod Support**: Detects when you are in a `component.js` or `template.hbs` and uses the parent folder name to find related files.
-   **Fast Directory Search**: Uses optimized directory-based search with parallel processing for lightning-fast results (typically under 1 second).
-   **File Type Support**: Finds related files including components, templates, routes, controllers, models, serializers, adapters, tests, and styles.
-   **Glimmer Component Support**: Full support for `.gjs` and `.gts` single-file components.
-   **Test File Detection**: Automatically identifies test files by filename pattern (`-test`, `.test`) and in test directories (`addon-test-support/`, `packages/tests/`, `tests/`, `test/`).
-   **Style File Support**: Supports `.less`, `.scss`, and `.css` files with proper labeling.
-   **Bidirectional Test File Hopping**: Find test files from source files and source files from test files.
-   **Configurable UI**: Toggle emojis in the search results via settings.
-   **Smart Filtering**: Automatically excludes the current file and removes duplicates from results.

## Keyboard Shortcut

| Action                 | Shortcut              |
| :--------------------- | :-------------------- |
| **Find Related Files** | `Cmd` + `Shift` + `.` |

## Extension Settings

This extension contributes the following settings:

-   `emberHopper.showEmojis`: (Boolean) Show/hide emojis in the file dropdown list for a cleaner look.

## Installation

1. Open **Cursor** or **VS Code**.
2. Press `Cmd + Shift + X` to open Extensions.
3. Click the `...` in the top right and select **Install from VSIX**.
4. Select the `ember-related-files-hopper-0.0.10.vsix` file.

---

## Known Issues

-   Currently optimized for projects where file names match the entity name (standard Ember convention).

## Release Notes

### 0.0.10

-   **Performance Optimization**: Balanced search depth for better speed while maintaining coverage
    -   Local directory search: depth 4 (optimized for nearby files)
    -   Common directory search: depth 6 (handles deeply nested structures)
    -   Significantly faster than 0.0.9 while still finding files in complex monorepo structures

### 0.0.9

-   **Bug Fix**: Fixed issue where related files weren't found when working with style files (`.less`, `.scss`, `.css`) or other files in deeply nested directories
-   **Improved Search Depth**: Optimized search depth (4 for local, 6 for common directories) to handle deeply nested monorepo structures while maintaining fast performance
    -   Now correctly finds files in paths like `lib/settings/addon/routes/settings/billing/payment-setup.js` when searching from `lib/billing/app/styles/less/payment-setup.less`
    -   Balanced coverage and speed for complex nested directory structures

### 0.0.8

-   **Collection-Scoped Search**: Added intelligent search scoping for monorepo structures
    -   Files in `lib/<collection>/` (e.g., `lib/documents/addon/components/foo.js`) now only search within that specific collection
    -   Files in `packages/<collection>/` (e.g., `packages/charting/src/components/bar.ts`) search within the collection and related test directories:
        -   `packages/<collection>/`
        -   `tests/acceptance/<collection>/`
        -   `tests/integration/<collection>/`
    -   Files in other locations (e.g., `app/`, `src/`) maintain the original broad search behavior
-   **Performance**: Improved search performance by limiting scope when working within collections
-   **Better Results**: Prevents cross-collection matches in large monorepo structures

### 0.0.7

-   Increased search depth from 4 to 8 for deeply nested Ember monorepo structures
-   Now finds files in paths like `lib/settings/addon/routes/settings/billing/`
-   Improved coverage for complex project layouts with multiple nested directories

### 0.0.6

-   Added support for `.gjs` and `.gts` Glimmer component files (single-file components)
-   Glimmer files are automatically labeled as Components with 🧩 emoji

### 0.0.5

-   **Performance Improvements**:
    -   Switched to `fs.readdir` with `withFileTypes` option to eliminate separate `stat()` calls (2-3x faster)
    -   Parallel subdirectory processing for faster traversal
    -   Batched directory existence checks
-   **Bug Fixes**:
    -   Fixed label detection to use proper path segment matching instead of string includes (prevents false positives)
    -   Fixed pod structure matching logic to correctly find files in pod directories
    -   Improved test file detection to work bidirectionally (find tests from source files and vice versa)
-   **New Features**:
    -   Added support for `.scss` and `.css` style files
    -   Enhanced test file detection to recognize `-test` and `.test` filename patterns
    -   Expanded skip directories to include `bower_components` and `vendor`
-   **Code Quality**:
    -   Removed dead code
    -   Improved code organization with constants for file extensions and skip directories

### 0.0.4

-   Fixed issue where test files weren't found when searching from non-test files
-   Added test directory searching when in source files
-   Improved file matching to include test file variants (`-test`, `.test`)

### 0.0.3

-   Added support for `.less` style files
-   Enhanced test file name handling for files ending with `-test`
-   Improved search to include common Ember directories (`packages/`, `lib/`, `app/`, `src/`, `addon/`)

### 0.0.2

-   Added emoji indicators for serializers (📋) and adapters (🔌)
-   Improved test file detection for files in `addon-test-support/` and `packages/tests/` directories
-   Performance optimizations for large codebases

### 0.0.1

-   Initial release with Pods and Classic structure support
-   Fast directory-based search for quick results
-   Support for components, templates, routes, controllers, models, serializers, adapters, and tests
-   Automatic test file detection in `addon-test-support/` and `packages/tests/` directories
-   Emoji indicators for different file types (📝 Template, 🕹️ Controller, 🛣️ Route, 🧩 Component, 💾 Model, 📋 Serializer, 🔌 Adapter, 🧪 Test)
-   Smart filtering to exclude current file and remove duplicates
