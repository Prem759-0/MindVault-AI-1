// Detect Doomscrolling
let scrollCount = 0;
let lastScrollTime = Date.now();

window.addEventListener('scroll', () => {
  const now = Date.now();
  if (now - lastScrollTime < 100) {
    scrollCount++;
  } else {
    scrollCount = 0;
  }
  lastScrollTime = now;

  // If user scrolls rapidly 50+ times in short bursts, flag as doomscrolling
  if (scrollCount > 50) {
    chrome.runtime.sendMessage({ type: 'DOOMSCROLL_DETECTED' });
    scrollCount = 0; // Reset
  }
});

// Extract page context for AI summarization
function extractPageData() {
  const metaDescription = document.querySelector('meta[name="description"]');
  let text = metaDescription ? metaDescription.content : '';
  
  if (!text) {
    // Fallback: grab first few paragraphs
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map(p => p.innerText.trim())
      .filter(p => p.length > 50);
    text = paragraphs.slice(0, 2).join(' ');
  }

  // Send to background for saving
  chrome.runtime.sendMessage({
    type: 'PAGE_DATA',
    summary: text ? text.substring(0, 150) + "..." : "No clear summary available."
  });
}

// Run after a slight delay to ensure page loads
setTimeout(extractPageData, 2000);
