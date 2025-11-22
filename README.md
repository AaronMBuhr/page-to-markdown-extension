## Page → Markdown (Image Refs)

Convert the current page into clean Markdown with reference-style image links collected at the bottom of the document.

### Features

- **One-click conversion**: Use the browser action popup to convert the current tab into Markdown.
- **Reference-style images**: Inlined images become reference-style links (e.g. `![alt][img-hero]`), with all image URLs listed at the bottom.
- **Content-focused extraction**: Tries to use the page’s `main` element when present, stripping scripts, styles, forms, and other noise.
- **Preserves structure**: Supports headings, paragraphs, links, lists, code blocks, horizontal rules, and tables.

### Installation (Developer mode)

- **Clone** this repository or download it as a ZIP and extract it.
- In your Chromium-based browser (e.g. Chrome, Edge):
  - Open `chrome://extensions/`.
  - Enable **Developer mode**.
  - Click **Load unpacked** and select this folder.

### Usage

- **Open** the page you want to convert.
- **Click** the “Page → Markdown” extension icon.
- In the popup, click **“Convert this page to Markdown”**.
- A `.md` file will be generated and downloaded (you may be prompted for the save location).

### How it works

- A **content script** scans the page (preferring `main`, falling back to `body`), removes non-content elements, and walks the DOM to generate Markdown.
- **Images** are collected into a list of reference IDs (e.g. `img-hero`, `img-diagram-2`) and appended as `[id]: URL` definitions at the end of the file.
- A small **popup script** sends a `convert-page-to-markdown` message to the active tab, triggering the conversion and download.


