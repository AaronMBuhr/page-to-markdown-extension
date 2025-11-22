(function () {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (!msg || msg.type !== 'convert-page-to-markdown') {
        return;
      }
  
      try {
        const { markdown, title } = convertDocumentToMarkdown();
        triggerDownload(title + '.md', markdown);
        sendResponse({ ok: true });
      } catch (err) {
        console.error('Markdown conversion error:', err);
        sendResponse({ ok: false, error: String(err) });
      }
  
      // We respond synchronously.
      return false;
    });
  
    function triggerDownload(filename, text) {
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
  
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      // Must be in DOM for some browsers
      document.body.appendChild(a);
      a.click();
      a.remove();
  
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
  
    function convertDocumentToMarkdown() {
      const root = document.querySelector('main') || document.body;
      const clone = root.cloneNode(true);
  
      // Strip junky nodes
      clone
        .querySelectorAll(
          'script, style, noscript, svg, canvas, iframe, meta, link, form, button'
        )
        .forEach(n => n.remove());
  
      const imageRefs = [];
      const imageRefMap = new Map(); // src -> id
  
      function escapeMdText(text) {
        if (!text) return '';
        return text
          .replace(/\s+/g, ' ')
          .replace(/\\/g, '\\\\')
          .replace(/([*_`[\]])/g, '\\$1');
      }
  
      function escapeMdAlt(text) {
        if (!text) return '';
        return text
          .replace(/\s+/g, ' ')
          .replace(/\\/g, '\\\\')
          .replace(/([\[\]])/g, '\\$1');
      }
  
      function registerImage(src, alt) {
        src = src || '';
        if (imageRefMap.has(src)) {
          return imageRefMap.get(src);
        }
  
        let base =
          alt ||
          src.split(/[?#]/)[0].split('/').pop() ||
          'image';
  
        base = base
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        if (!base) base = 'image';
  
        let id = 'img-' + base;
        let suffix = 2;
        while (imageRefs.some(r => r.id === id)) {
          id = 'img-' + base + '-' + suffix++;
        }
  
        imageRefs.push({ id, src, alt: alt || '' });
        imageRefMap.set(src, id);
        return id;
      }
  
      function convertTable(tableEl, ctx) {
        const rows = Array.from(tableEl.querySelectorAll('tr'));
        if (!rows.length) return '';
  
        const headerCells = Array.from(rows[0].querySelectorAll('th, td'));
        if (!headerCells.length) return '';
  
        function cellContent(cell) {
          return Array.from(cell.childNodes)
            .map(child => convertNode(child, ctx))
            .join('')
            .trim();
        }
  
        const header =
          '|' +
          headerCells.map(c => ' ' + cellContent(c) + ' ').join('|') +
          '|\n';
        const separator =
          '|' +
          headerCells
            .map(() => ' --- ')
            .join('|') +
          '|\n';
  
        const bodyRows = rows
          .slice(1)
          .map(row => {
            const cells = Array.from(row.querySelectorAll('td, th'));
            if (!cells.length) return '';
            return (
              '|' +
              cells
                .map(c => ' ' + cellContent(c) + ' ')
                .join('|') +
              '|\n'
            );
          })
          .join('');
  
        return '\n' + header + separator + bodyRows + '\n';
      }
  
      function convertNode(node, ctx) {
        ctx = ctx || { listDepth: 0 };
  
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          return escapeMdText(text);
        }
  
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return '';
        }
  
        const tag = node.tagName.toLowerCase();
        const childCtx = { ...ctx };
  
        const childrenToMarkdown = () =>
          Array.from(node.childNodes)
            .map(child => convertNode(child, childCtx))
            .join('');
  
        switch (tag) {
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6': {
            const level = parseInt(tag.substring(1), 10);
            const content = childrenToMarkdown().trim();
            if (!content) return '';
            return '\n' + '#'.repeat(level) + ' ' + content + '\n\n';
          }
  
          case 'p': {
            const content = childrenToMarkdown().trim();
            if (!content) return '';
            return '\n' + content + '\n\n';
          }
  
          case 'br':
            return '  \n';
  
          case 'strong':
          case 'b': {
            const content = childrenToMarkdown().trim();
            if (!content) return '';
            return '**' + content + '**';
          }
  
          case 'em':
          case 'i': {
            const content = childrenToMarkdown().trim();
            if (!content) return '';
            return '*' + content + '*';
          }
  
          case 'a': {
            const hrefAttr = node.getAttribute('href') || '';
            const content = childrenToMarkdown().trim();
            const label = content || hrefAttr;
            if (!hrefAttr) return label;
  
            const absolute = node.href || hrefAttr;
            return '[' + label + '](' + absolute + ')';
          }
  
          case 'img': {
            const src = node.getAttribute('src') || '';
            const alt = node.getAttribute('alt') || '';
            const id = registerImage(src, alt);
            return '![' + escapeMdAlt(alt) + '][' + id + ']';
          }
  
          case 'ul': {
            const items = Array.from(node.children).filter(
              n => n.tagName && n.tagName.toLowerCase() === 'li'
            );
            const lines = items
              .map(li =>
                convertNode(li, { ...ctx, listDepth: ctx.listDepth + 1 })
              )
              .join('');
            return '\n' + lines + '\n';
          }
  
          case 'ol': {
            const items = Array.from(node.children).filter(
              n => n.tagName && n.tagName.toLowerCase() === 'li'
            );
            let index = 1;
            const lines = items
              .map(li => {
                const liText = convertNode(li, {
                  ...ctx,
                  listDepth: ctx.listDepth + 1
                }).trim();
                if (!liText) return '';
                const prefix =
                  ' '.repeat(ctx.listDepth * 2) + index++ + '. ';
                return prefix + liText + '\n';
              })
              .join('');
            return '\n' + lines + '\n';
          }
  
          case 'li': {
            const content = childrenToMarkdown().trim();
            if (!content) return '';
            const prefix =
              ' '.repeat(Math.max(0, ctx.listDepth - 1) * 2) + '- ';
            return prefix + content + '\n';
          }
  
          case 'pre': {
            const codeNode = node.querySelector('code');
            const text = codeNode ? codeNode.textContent : node.textContent;
            const cleaned = text.replace(/\s+$/, '');
            return '\n```\n' + cleaned + '\n```\n\n';
          }
  
          case 'code': {
            const content = node.textContent || '';
            return '`' + content.replace(/`/g, '\\`') + '`';
          }
  
          case 'hr':
            return '\n---\n\n';
  
          case 'table':
            return convertTable(node, ctx);
  
          default: {
            const blockTags = [
              'div',
              'section',
              'article',
              'header',
              'footer',
              'main',
              'nav',
              'aside',
              'figure',
              'figcaption'
            ];
            const content = childrenToMarkdown().trim();
            if (!content) return '';
            if (blockTags.includes(tag)) {
              return '\n' + content + '\n\n';
            }
            return content;
          }
        }
      }
  
      const bodyMarkdown = convertNode(clone, { listDepth: 0 }).trim();
  
      let md = bodyMarkdown;
  
      if (imageRefs.length) {
        md += '\n\n<!-- Image references (used above) -->\n';
        for (const { id, src } of imageRefs) {
          md += `[${id}]: ${src}\n`;
        }
      }
  
      const title = (document.title || 'page')
        .replace(/[\\\/:*?"<>|]/g, '_')
        .trim() || 'page';
  
      return { markdown: md + '\n', title };
    }
  })();
  