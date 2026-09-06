# Maru's Autotag

Maru's Autotag enriches companion notes created by Binary File Manager in Obsidian.

It can add folder-based frontmatter tags, AI-generated descriptions and tags through local Ollama workflows, geolocation tags from image metadata, duplicate protection, pair management, and recovery tools for existing vaults.

## Status

This plugin is still in beta. BRAT is the recommended first distribution path while the plugin is tested with real vaults before a wider Obsidian Community Plugin submission.

## Install With BRAT

1. Install **Obsidian42 - BRAT** from Obsidian's Community Plugins.
2. Open the command palette.
3. Run **BRAT: Add a beta plugin for testing**.
4. Paste `https://github.com/maruXmaruTV/marus-autotag`.
5. Let BRAT install the plugin, then enable **Maru's Autotag** in **Settings -> Community plugins**.

For BRAT releases, attach these files to each GitHub release:

- `manifest.json`
- `main.js`
- `styles.css`

The release tag, release name, and `manifest.json` version should match exactly, for example `0.1.0`.

## Requirements

- Obsidian
- Binary File Manager, used to create companion notes
- Optional: AI Image Analyzer
- Optional: Ollama for local AI tag generation

## What It Does

- Watches a configured source folder for new image/source files.
- Finds or creates matching companion notes in the configured metadata folder.
- Adds frontmatter from folder structure, AI tags, Vault Awareness, Bridge rules, and geolocation metadata.
- Tracks stable image/note pairs for safer deletion, duplicate handling, and manual repair.
- Detects exact and visual duplicates and offers replacement, migration, autorename, delete, and process-anyway flows.
- Includes settings tools for health checks, importing/exporting setup profiles, reprocessing, indexing existing vaults, and recovery.

## Beta Notes

Some features can call local or external services depending on your settings. Public Nominatim is rate-limited and shared by the community; Maru's Autotag queues delayed geolocation lookups and can use a local Nominatim server if configured.

No telemetry is included.

## License

Maru's Autotag is free software licensed under **GPL-3.0-or-later**.

If you distribute a modified version, keep the license and attribution notices, provide the corresponding source code, and retain the original project attribution from `NOTICE`.

## Development

Install dependencies:

```bash
npm install
```

Build:

```bash
npm run build
```

Manual test install:

Copy `manifest.json`, `main.js`, and `styles.css` into:

```text
<Vault>/.obsidian/plugins/marus-autotag/
```

Then reload Obsidian and enable **Maru's Autotag**.
