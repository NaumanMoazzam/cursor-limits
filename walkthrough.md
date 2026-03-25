# Cursor Limits Extension Walkthrough

This document outlines the architecture, features, and testing instructions for the Cursor Limits extension we just built.

## What Are We Achieving?

We set out to build a utility for Cursor IDE that replicates the experience of the popular `claude-statusline` VS Code extension. Specifically, we wanted to surface the user's hidden "Pro Limits" (such as Fast Requests and Composer Limits) directly into the bottom status bar of the editor.

Cursor does not provide a public API for this, nor do they expose your remaining usage within the IDE easily without clicking into external dashboards. This extension completely automates parsing those limits and visualizes them natively.

---

## What We Have Done

We built a complete, production-ready VS Code extension specifically tailored for the Cursor environment, focusing on minimizing "user friction." 

### 1. Zero-Friction Authentication (The "Hacker" Way)

Rather than forcing you to dig through DevTools to find your `Workos-Session` token, we automated the extraction process. 

- The extension runs a background process (`child_process.execSync`) targeting your local OS's built-in `sqlite3` binary.
- It silently queries Cursor's internal global state database (`~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`) for the key `cursorAuth/accessToken`.
- This provides the session token needed to authenticate against the private endpoint `https://www.cursor.com/api/usage`.

### 2. High-Fidelity UI Integrations

We leveraged standard VS Code API endpoints to build a beautiful status item:

- **Visual Progress Bar**: Generates a fast, localized ASCII progress bar (e.g., `[██████░░░░]`) directly in the status text.
- **Dynamic Color Coding**: Uses native `vscode.ThemeColor` integrations. It gracefully shifts from normal foreground to `statusBarItem.warningForeground` (yellow) at 80% usage and `statusBarItem.errorForeground` (red) at 95% usage.
- **Detailed Markdown Tooltip**: Hovering over the status item reveals a formatted Markdown popup showing exactly how many Premium Requests and Composer/Auto requests remain.
- **Click Action**: Directly tied the `statusBarItem.command` to an environment open command that instantly launches `https://cursor.com/dashboard` in your browser.

### 3. Build & Packaging

- Successfully scaffolded all configuration files (`tsconfig.json`, `launch.json`, `tasks.json`, `package.json`).
- Handled all TypeScript typings and native Node.js ES modules.
- Compiled down to pure JavaScript and packaged everything into a final local binary—`cursor-limits-0.0.1.vsix`.

---

## How to Test It

Because the extension has already been compiled and packaged into a `.vsix` wrapper, installation is a breeze.

### Method 1: The Dev Host (For fast iteration)

If you want to view or tweak the TypeScript code (`src/extension.ts`):

1. Open the source directory inside Cursor: `File -> Open Folder` -> `/Users/apple/cursor-limits`
2. Press `F5` on your keyboard.
3. A secondary "Extension Development Host" Cursor window will pop up. Your new status bar will instantly appear in the bottom right corner of that new window!

### Method 2: Permanent Installation

If you simply want to test the binary on your primary environment forever:

1. Reveal your Extensions Sidebar (Press `Cmd+Shift+X`).
2. At the top-right of that sidebar panel, click the `...` (three dots) view menu.
3. Click **"Install from VSIX..."**
4. Navigate locally to `/Users/apple/cursor-limits/` and select `cursor-limits-0.0.1.vsix`.
5. The extension will install instantly and remain active across all your projects.

