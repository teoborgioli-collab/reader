# Epub Reader

A static, single-page EPUB reader. Everything runs in the browser — no
upload, no server, no build step. Reading position, font size, and theme are
remembered per-book in `localStorage` on your device.

## Files

```
index.html    the whole app
package.json  placeholder so Vercel doesn't try to detect a framework
vercel.json   marks this as a plain static deploy
```

## Run locally

Just open `index.html` in a browser, or serve it:

```bash
npx serve .
```

## Deploy to Vercel

1. Put these files in a GitHub repo (or run `vercel` from this folder with
   the Vercel CLI).
2. vercel.com/new → import the repo. Framework **Other**, build command
   **empty**, output directory **empty** (or just the repo root).
3. Deploy. No environment variables or storage needed.

## Using it

- **Open EPUB** or drag-and-drop a `.epub` file onto the page.
- Click the left/right edges of the page (or use arrow keys) to turn pages.
- **☰ Contents** opens the table of contents.
- **Aa** opens font size and theme (light/sepia/dark) controls.
- **✕** closes the current book and returns to the picker.

Nothing is uploaded anywhere — the file is read directly in your browser via
the File API, so this works offline once the page and its two CDN scripts
(epub.js and JSZip) are cached.
