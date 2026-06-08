export default defineContentScript({
    matches: ['*://*.x.com/*', '*://*.twitter.com/*'],
    main(ctx) {
        console.log('x Multi-Type Element Monitoring Started...');

        // 1. Check for Shorts Section Shelves (Home / Subscription Feeds)
        function isShortsSection(element: Element) {
            if (element.tagName === 'YTD-RICH-SECTION-RENDERER') {
                return !!element.querySelector('ytd-rich-shelf-renderer[is-shorts]');
            }
            return false;
        }

        // 2. Check for Standard Grid Cards (Homepage / Channel Video Grid)
        function isStandardVideoCard(element: Element) {
            if (element.tagName === 'YTD-RICH-ITEM-RENDERER') {
                const hasStandardLockup = !!element.querySelector('yt-lockup-view-model');
                const hasWatchLink = !!element.querySelector('a[href*="/watch?v="]');
                return hasStandardLockup && hasWatchLink;
            }
            return false;
        }

        // 3. NEW: Check for Individual Search Result Videos
        function isSearchResultVideo(element: Element) {
            if (element.tagName === 'YTD-VIDEO-RENDERER') {
                // Matches the explicit custom element and fallback link signatures
                const isSearchUI = element.hasAttribute('is-search') || element.hasAttribute('use-search-ui');
                const hasWatchLink = !!element.querySelector('a#video-title[href*="/watch?v="]');
                return isSearchUI && hasWatchLink;
            }
            return false;
        }

        // 4. Mutation Handling Loop
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node instanceof Element) {

                            // Map current nodes or extract target tags embedded within a new layout subtree block
                            const candidateSection = node.tagName === 'YTD-RICH-SECTION-RENDERER' ? node : node.querySelector('ytd-rich-section-renderer');
                            const candidateItem = node.tagName === 'YTD-RICH-ITEM-RENDERER' ? node : node.querySelector('ytd-rich-item-renderer');
                            const candidateSearch = node.tagName === 'YTD-VIDEO-RENDERER' ? node : node.querySelector('ytd-video-renderer');

                            // Evaluation A: Shorts Shelf
                            if (candidateSection && isShortsSection(candidateSection)) {
                                console.log('🛑 Shorts Shelf Intercepted:', candidateSection);
                                // Actions...
                            }

                            // Evaluation B: Standard Grid Item
                            if (candidateItem && isStandardVideoCard(candidateItem)) {
                                const title = candidateItem.querySelector('.ytLockupMetadataViewModelTitle span')?.textContent || 'Unknown Title';
                                console.log(`🎥 Grid Card Intercepted: "${title}"`, candidateItem);
                                // Actions...
                            }

                            // Evaluation C: Search Result Video Entry
                            if (candidateSearch && isSearchResultVideo(candidateSearch)) {
                                // Safely grab the title text from the search layout configuration structure
                                const title = candidateSearch.querySelector('#video-title a, #video-title')?.getAttribute('title') ||
                                    candidateSearch.querySelector('#video-title yt-formatted-string')?.textContent || 'Unknown Search Title';
                                console.log(`🔍 Search Result Video Intercepted: "${title.trim()}"`, candidateSearch);
                                // Actions...

                                const visibleText = candidateSearch.textContent || '';
                                const targetRegex = /xvideos|pornhub|xnxx|porn|pakistan/i;
                                if (targetRegex.test(visibleText)) {
                                    // Highlight the detected element with a left border
                                    if (candidateSearch instanceof HTMLElement) {
                                        // Apply your visual styles
                                        candidateSearch.style.borderLeft = '4px solid rgba(255, 77, 77, 1)';
                                        candidateSearch.style.borderRadius = '10px';
                                        candidateSearch.style.opacity = '0.05';

                                        // Disable all mouse clicks and interactions
                                        candidateSearch.style.pointerEvents = 'none';

                                        // Optional: Change the cursor style so the user knows it's unclickable 
                                        // Note: Because pointer-events is 'none', you must apply the cursor style 
                                        // to a wrapper element if you want it to show up, or leave it as is.
                                        candidateSearch.style.cursor = 'not-allowed';

                                    }
                                    //element.style.display = 'none';
                                }

                            }

                        }
                    }
                }
            }
        });

        // Run the observer stream
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Framework destruction hook cleanup
        ctx.onInvalidated(() => {
            observer.disconnect();
        });
    },
});