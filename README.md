# Ember Related Files Hopper 🚀

A lightning-fast way to navigate between related files in an Ember.js project. Whether you are using **Classic** or **Pods** structure, this extension helps you "hop" between templates, controllers, routes, and tests instantly.

## Features

-   **Smart Detection**: Automatically identifies the base entity (e.g., `user-profile`) regardless of which file you are currently in.
-   **Pod Support**: Detects when you are in a `component.js` or `template.hbs` and uses the parent folder name to find related files.
-   **Fast Directory Search**: Uses optimized directory-based search for lightning-fast results (typically under 1 second).
-   **File Type Support**: Finds related files including components, templates, routes, controllers, models, serializers, adapters, and tests.
-   **Test File Detection**: Automatically identifies test files in `addon-test-support/` and `packages/tests/` directories.
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
4. Select the `ember-related-files-hopper-0.0.1.vsix` file.

---

## Known Issues

-   Currently optimized for projects where file names match the entity name (standard Ember convention).

## Release Notes

### 1.0.0

-   Initial release with Pods and Classic structure support.
-   Fast directory-based search for quick results.
-   Support for components, templates, routes, controllers, models, serializers, adapters, and tests.
-   Automatic test file detection in `addon-test-support/` and `packages/tests/` directories.
-   Emoji indicators for different file types (📝 Template, 🕹️ Controller, 🛣️ Route, 🧩 Component, 💾 Model, 📋 Serializer, 🔌 Adapter, 🧪 Test).
-   Smart filtering to exclude current file and remove duplicates.
