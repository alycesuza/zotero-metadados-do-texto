# zotero-metadata-from-text

Lê as primeiras cinco páginas dos PDFs, texto HTML/TXT e notas OCR existentes para propor correções com evidência.

Independent Zotero 10.0.x desktop plugin. Initial pre-release 0.1.0 for user testing. Download the XPI from [Releases](https://github.com/alycesuza/zotero-metadata-from-text/releases), including pre-releases, and install it through Zotero Tools > Plugins > Install Plugin From File.

All document processing stays local. No AI service or metadata API is called. See the [Portuguese manual](../README.md) for functionality, limitations, usage and reversible changes. Build with `python scripts/build.py`; run `npm test`.

AGPL-3.0-only. Inspired by the repository organization of Zotero-OCR; this plugin does not implement or bundle an OCR engine.
