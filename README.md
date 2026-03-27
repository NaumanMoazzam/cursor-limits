# Cursor Limits

VS Code / **Cursor** extension that reads your session from Cursor’s local SQLite database and calls Cursor’s dashboard HTTP APIs to show **Fast / Premium** usage in the **status bar**, with a progress bar, color thresholds, and a detailed hover tooltip.

## Disclaimer

This extension uses **undocumented** storage keys and `cursor.com` routes that may change at any time. It may **stop working** after a Cursor update. See [SECURITY.md](SECURITY.md) for what is read and where requests go, and [POLICY.md](POLICY.md) before publishing or redistributing.

This is tested on MacOS -- For Windows & Linux, it may not work as intended.

## Features

- **Minimal setup**: Reads `cursorAuth/accessToken` from Cursor’s `state.vscdb` via the system `sqlite3` binary (no manual token copy).
- **Color coding**: Warning near high usage, error color at very high usage.
- **Progress bar**: ASCII bar in the status text.
- **Tooltip**: Premium vs Auto/Composer-style breakdown when available from the API.
- **Dashboard**: Command / click opens Cursor’s spending dashboard in the browser.

## Requirements

- **Cursor** (or a VS Code build where Cursor’s data paths apply) with a logged-in account.
- **`sqlite3`** available on your `PATH` (macOS/Linux often have it; on Windows install SQLite or ensure `sqlite3.exe` is on `PATH`).

## Install

### From a VSIX (local or CI artifact)

1. Run `npm install` and `npm run compile`, then `npm run vsix` to produce `cursor-limits-0.0.1.vsix` (version from `package.json`).
2. In Cursor: **Extensions** → **…** → **Install from VSIX…** and select the file.


## Development

1. `npm install`
2. `npm run compile` (or `npm run watch`)
3. Open this folder in Cursor/VS Code and press **F5** (Extension Development Host).

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security and policy

- [SECURITY.md](SECURITY.md) — data access and reporting issues.
- [POLICY.md](POLICY.md) — marketplace and terms-of-use checklist for maintainers.

## License

MIT — see [LICENSE](LICENSE).
