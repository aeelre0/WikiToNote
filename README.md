<div align="center">

# 📚 Wiki2Note

**Wikipedia → Obsidian, without the copy-paste.**

A fast, no-nonsense Obsidian plugin for turning any Wikipedia article into a clean, ready-to-read note — tables, math, links and all.

<img alt="Version" src="https://img.shields.io/badge/version-1.0-blue.svg" />
<img alt="Obsidian" src="https://img.shields.io/badge/Obsidian-plugin-7C3AED.svg" />
<img alt="License: GPL-2.0-only" src="https://img.shields.io/badge/License-GPL--2.0--only-blue.svg" />
<img alt="Made with TypeScript" src="https://img.shields.io/badge/Made%20with-TypeScript-3178C6.svg" />

</div>

---

## Contents

- [About](#about)
- [Features](#-features)
- [Usage](#-usage)
- [Settings](#%EF%B8%8F-settings)
- [Fork](#-fork)
- [License](#-license)
- [Credits](#-credits)

---

## About

**Wiki2Note** makes it effortless to turn a Wikipedia article into an Obsidian note.

No manual copy-pasting, no cleaning up broken HTML, no fighting with formatting — just run a command, type an article name, and get a clean Markdown note in your vault.

> Simple. Fast. No unnecessary complexity.

---

## ✨ Features

- **📄 One-command import** — pull any Wikipedia article straight into your vault
- **📥 Import multiple articles at once** — queue up several entries in a single go
- **📊 Real Obsidian tables** — Wikipedia's HTML tables are converted into native `| a | b |` Markdown tables, not dumped as raw HTML
- **🧮 Proper math rendering** — formulas are converted into real LaTeX (`$...$`), rendered natively by Obsidian's MathJax instead of showing up as broken image links
- **📝 Insert into your active note** *(optional)* — paste imported content straight into the note you already have open, instead of always creating a new one
- **🌍 Multi-language support** — choose which Wikipedia language edition (`en`, `tr`, `de`, ...) articles are imported from
- **🎨 Theme-aware UI** — the import window matches your active Obsidian theme, light or dark
- **🖼️ Image references** — embedded images are kept as links with captions, so nothing gets silently dropped

---

## 🚀 Usage

1. Open the command palette:

   ```text
   Ctrl+P
   ```

2. Run one of:

   ```text
   Wiki 2 Note: Import Wikipedia article
   Wiki 2 Note: Import multiple articles
   ```

3. Start typing an article name and pick a suggestion (or just type the exact title).
4. Hit **Generate** — the article lands in your vault as a note, fully formatted.

---

## ⚙️ Settings

Available under **Settings → Wiki2Note**:

| Setting | Description |
| --- | --- |
| **Country prefix** | Which Wikipedia language edition to import from (e.g. `en`, `tr`) |
| **Table background / border** | Colors used for tables that can't be expressed as plain Markdown |
| **Insert into active note** | Insert imported content into the currently open note instead of creating a new one |

---

## 🍴 Fork

Wiki2Note is a **fork of [CommandJoo/WikiToNote](https://github.com/CommandJoo/WikiToNote)**.

The original project provided the foundation for this plugin, and this repository continues that work with independent modifications and contributions.

Many thanks to **Johannes Hans ([@CommandJoo](https://github.com/CommandJoo))** for creating and releasing the original project.

**Original project:** WikiToNote — https://github.com/CommandJoo/WikiToNote

---

## 📜 License

This repository contains code originally released under the **0BSD License**, as well as original modifications and contributions distributed under the **GNU General Public License, version 2 only**.

The applicable license is identified on a per-file basis where necessary.

License texts are available in:

```text
LICENSES/
├── 0BSD.txt
└── GPL-2.0-only.txt
```

**Original code** — code originating from the upstream project remains subject to its original **0BSD** licensing terms.

**Contributions** — original modifications and contributions made in this fork are distributed under the **GNU GPL version 2 only**.

SPDX identifier:

```text
GPL-2.0-only
```

---

## 🙌 Credits

Wiki2Note would not exist without the original work of **Johannes Hans ([@CommandJoo](https://github.com/CommandJoo))**.

Original repository: https://github.com/CommandJoo/WikiToNote

---

<div align="center">

Made for <a href="https://obsidian.md/">Obsidian</a> users who prefer their knowledge in their own vault.

</div>
