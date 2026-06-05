export default defineContentScript({
  matches: ['*://*.facebook.com/*'],
  main(ctx) {
    console.log('Hello content.', ctx);

    // 1. Define the class names you are looking for
    // Tip: Facebook uses highly obfuscated/dynamic classes, so choose stable ones if possible
    const TARGET_CLASSES = ["x1lliihq"];

    // 2. Function to check if an element matches our target classes
    function checkElement(element: Element) {
      if (!(element instanceof HTMLElement)) return;
      if (element.tagName !== 'DIV') return;

      // Check if the element contains ANY of your target classes
      const hasClass = TARGET_CLASSES.some(className => element.classList.contains(className));

      if (hasClass) {
        console.log('🎯 Target div detected!');

        // Find the closest post card/container to capture the full post context
        const postContainer = (element.closest('div[role="article"]') || element.closest('[data-pagelet^="FeedUnit_"]') || element) as HTMLElement;

        // Function to parse cleaner post text and media assets (images/videos)
        function parsePostData(container: HTMLElement) {
          // 1. Try to find the actual post text block container
          let text = '';
          const messageBlock = container.querySelector('[data-ad-comet-preview="message"], [data-ad-preview="message"]');
          if (messageBlock) {
            text = (messageBlock as HTMLElement).innerText;
          } else {
            // Fallback: Facebook user text is usually in a div with dir="auto"
            const fallbackBlock = container.querySelector('div[dir="auto"]');
            if (fallbackBlock) {
              text = (fallbackBlock as HTMLElement).innerText;
            } else {
              text = container.innerText;
            }
          }
          text = text.trim();

          // 2. Extract media assets
          const media: { type: 'image' | 'video'; src: string }[] = [];

          // Images: Extract post images, ignoring tiny icons/reactions and profile photos
          const imgs = container.querySelectorAll('img');
          imgs.forEach(img => {
            const src = img.src;
            if (src) {
              const isIcon = src.includes('/rsrc.php') || src.includes('emoji.php') || src.includes('/static_resources/');
              const isProfile = src.includes('/profile/') || img.closest('[role="link"]') || img.width < 100 || img.height < 100;
              if (!isIcon && !isProfile) {
                media.push({ type: 'image', src });
              }
            }
          });

          // Videos: Extract video tags
          const videos = container.querySelectorAll('video');
          videos.forEach(video => {
            const src = video.src || video.querySelector('source')?.src;
            if (src) {
              media.push({ type: 'video', src });
            }
          });

          return { text, media };
        }

        const { text: textContent, media: mediaList } = parsePostData(postContainer);
        console.log('📝 Cleaned Post Text:', textContent);
        console.log('🎬 Media Found:', mediaList);

        const targetRegex = /bangladesh|pakistan|hindu|muslim|islam|sanatan|hinduism|buddhist|christian|atheist|atheism/i;
        if (targetRegex.test(textContent)) {
          // Highlight the detected post card with a thick red left border
          postContainer.style.borderLeft = '6px solid rgba(255, 77, 77, 1)';

          // Add a semi-transparent red overlay to the post card if not already added
          if (!postContainer.querySelector('.detected-overlay')) {
            const overlay = document.createElement('div');
            overlay.className = 'detected-overlay';

            // Style the overlay
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(255, 77, 77, 0.5)'; // 10% opacity red tint
            overlay.style.pointerEvents = 'none'; // Clicks pass through
            overlay.style.zIndex = '999';
            overlay.style.transition = 'opacity 0.3s ease';

            // Ensure parent is relative-positioned
            const currentPosition = window.getComputedStyle(postContainer).position;
            if (currentPosition === 'static') {
              postContainer.style.position = 'relative';
            }

            postContainer.appendChild(overlay);
          }
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
              const children = node.querySelectorAll('div');
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