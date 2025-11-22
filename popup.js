document.getElementById('convert-btn').addEventListener('click', () => {
    const status = document.getElementById('status');
    status.textContent = 'Converting…';
  
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab = tabs[0];
      if (!tab) {
        status.textContent = 'No active tab.';
        return;
      }
  
      chrome.tabs.sendMessage(
        tab.id,
        { type: 'convert-page-to-markdown' },
        response => {
          if (chrome.runtime.lastError) {
            status.textContent = 'Error: ' + chrome.runtime.lastError.message;
          } else if (response && response.ok) {
            status.textContent = 'Markdown download triggered.';
          } else {
            status.textContent = 'Conversion failed.';
          }
        }
      );
    });
  });
  