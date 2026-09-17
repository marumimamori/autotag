# Autotag

Autotag creates and enriches companion notes for files in Obsidian.

Created by [Maru](https://marumimamori.me).

It can add folder-based frontmatter tags, AI-generated descriptions and tags through local Ollama workflows, geolocation tags from image metadata, duplicate protection, pair management, and recovery tools for existing vaults.

## Status

This plugin is still in beta. BRAT is the recommended first distribution path while the plugin is tested with real vaults before a wider Obsidian Community Plugin submission.

## Install With BRAT

1. Install **Obsidian42 - BRAT** from Obsidian's Community Plugins.
2. Open the command palette.
3. Run **BRAT: Add a beta plugin for testing**.
4. Paste `https://github.com/marumimamori/autotag`.
5. Let BRAT install the plugin, then enable **Autotag** in **Settings -> Community plugins**.

For BRAT releases, attach these files to each GitHub release:

- `manifest.json`
- `main.js`
- `styles.css`

The release tag, release name, and `manifest.json` version should match exactly, for example `0.1.0`.

## Requirements

- Obsidian
- Optional: Ollama for local image analysis, AI descriptions, and AI tag generation

## What It Does

- Watches a configured source folder for new image/source files.
- Finds or creates matching companion notes in the configured metadata folder.
- Adds frontmatter from folder structure, AI tags, Vault Awareness, Bridge rules, and geolocation metadata.
- Tracks stable image/note pairs for safer deletion, duplicate handling, and manual repair.
- Detects exact and visual duplicates and offers replacement, migration, autorename, delete, and process-anyway flows.
- Includes settings tools for health checks, importing/exporting setup profiles, reprocessing, indexing existing vaults, and recovery.

## Companion Note Name Tokens

Companion note names can use `{{name}}`, `{{filename}}`, `{{extension}}`, `{{path}}`, `{{link}}`, and `{{embed}}`.

Token casing only changes `{{name}}`, `{{filename}}`, and `{{extension}}` style tokens: uppercase tokens such as `{{NAME}}` write uppercase, title-style tokens such as `{{Name}}` keep the original upper/lowercase text, and lowercase tokens write lowercase. `{{path}}`, `{{link}}`, and `{{embed}}` always keep the real vault path casing so links stay valid.

## Thanks

Autotag is independent and does not require Binary File Manager, Templater, or AI Image Analyzer. It includes a Thanks tab because those community projects helped inspire the companion-note, templating, and image-to-metadata ideas behind the plugin.

## Beta Notes

Some features can call local or external services depending on your settings. Public Nominatim is rate-limited and shared by the community; Autotag queues delayed geolocation lookups and can use a local Nominatim server if configured.

No telemetry is included.

## License

Autotag is free software licensed under **GPL-3.0-or-later**.

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
<Vault>/.obsidian/plugins/autotag/
```

Then reload Obsidian and enable **Autotag**.
