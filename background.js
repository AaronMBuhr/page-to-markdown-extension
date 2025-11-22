chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.type === 'markdown-result') {
      const { markdown, title } = message;
  
      const filenameBase = (title || 'page')
        .replace(/[\\\/:*?"<>|]/g, '_')
        .trim() || 'page';
  
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
  
      chrome.downloads.download(
        {
          url,
          filename: filenameBase + '.md',
          saveAs: true
        },
        downloadId => {
          if (chrome.runtime.lastError) {
            console.error('Download error:', chrome.runtime.lastError);
          }
          // We can revoke later, but after download is enough.
          setTimeout(() => URL.revokeObjectURL(url), 30000);
        }
      );
    } else if (message && message.type === 'markdown-error') {
      console.error('Markdown conversion error:', message.message || message);
    }
  });
  