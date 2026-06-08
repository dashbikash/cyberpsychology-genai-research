export default defineContentScript({
  matches: ['*://*.duckduckgo.com/*'],
  main(ctx) {
    console.log('Hello content.', ctx);

    // 1. Define the class names you are looking for
    // Tip: Facebook uses highly obfuscated/dynamic classes, so choose stable ones if possible
    const TARGET_CLASSES = ['wLL07_0Xnd1QZpzpfR4W'];

    // 2. Function to check if an element matches our target classes
    function checkElement(element: Element) {
      if (!(element instanceof HTMLElement)) return;
      if (element.tagName !== 'LI') return;

      // Check if the element contains ANY of your target classes
      const hasClass = TARGET_CLASSES.some(className => element.classList.contains(className));

      if (hasClass) {
        console.log('🎯 Target div detected!');

        // innerText retrieves only the visible text content as rendered by the browser
        const visibleText = element.innerText;
        console.log(visibleText);

        const targetRegex = /xvideos|pornhub|xnxx|porn|pakistan/i;
        if (targetRegex.test(visibleText)) {
          // Highlight the detected element with a left border
          element.style.borderLeft = '4px solid rgba(255, 77, 77, 1)';
          element.style.display = 'none';
        }


        // Send message to background script if needed
        // browser.runtime.sendMessage({ event: 'TARGET_DIV_FOUND' });
      }
    }

    // 3. Set up the MutationObserver to watch the DOM
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node instanceof Element) {
              // Check the added node itself
              checkElement(node);

              // Also check any matching child nodes inside the added tree
              const children = node.querySelectorAll('li');
              children.forEach(child => checkElement(child));
            }
          }
        }
      }
    });

    // 4. Start observing the entire document body
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 5. Clean up the observer when the content script context is destroyed
    // (Crucial for framework-based extensions to prevent memory leaks)
    ctx.onInvalidated(() => {
      console.log('Cleaning up observer...');
      observer.disconnect();
    });
  },
});