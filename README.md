# PaperWrite
Static site (no build, no backend). Files: `index.html`, `styles.css`, `app.js`.

## Deploy (GitHub Pages)
1. In your repo (branch `main`), replace `index.html` and add `styles.css`, `app.js`, `README.md` (GitHub → Add file → Upload files, drag all four, Commit to `main`; or `git add . && git commit -m "PaperWrite upgrade" && git push origin main`).
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
3. Wait ~1 min, open your Pages URL, hard-refresh (Ctrl+Shift+R).

## External dependencies
cdnjs: PDF.js 3.11.174 (+worker), pdf-lib 1.17.1, Fabric.js 5.3.1. Google Fonts: Caveat, Kalam, Patrick Hand, Indie Flower (OFL). Files never leave the browser.

## The PDF bug
`#pdfCanvas` was both the PDF render target and the Fabric canvas, then set to `display:none`, so the page rendered invisibly. It's now a separate offscreen canvas set as Fabric background. Export no longer paints an opaque page image: the original PDF pages are kept and a transparent annotation PNG is drawn over them.

## Limitations
- Annotations export as a transparent image overlay (not editable text in the PDF).
- PDF pages with a /Rotate flag may place overlays wrongly. No page-rotation or arrow tool.
- Undo/redo history resets when you change page (edits themselves are kept).
- Encrypted/password PDFs are rejected. Very large PDFs render one page at a time.
- Fonts need internet (Google Fonts) or they fall back to a cursive system font.

## Test checklist (live site)
Handwriting: type text → change font/ink/paper/size → long text makes page 2 → PDF export → PNG export.
Editor: upload 1-page PDF → page appears; upload multipage → next/prev, annotations persist → add/move/resize/rotate/edit/delete text → pen/highlight/shapes/eraser/undo → export and open PDF (original content visible under annotations) → upload JPG/PNG/WEBP → try a .txt (error toast) → check on phone.
