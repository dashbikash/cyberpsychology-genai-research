export default defineContentScript({
    matches: ['*://*.youtube.com/*'],
    main(ctx) {
        console.log('YouTube Multi-Type Element Monitoring Started...');

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

        // Helper to guarantee we get a thumbnail URL
        function getThumbnailUrl(element: Element): string | null {
            // 1. Try to get the actual image element (checking multiple layout versions)
            const img = element.querySelector(
                'yt-thumbnail-view-model .ytThumbnailViewModelImage img, ytd-thumbnail img, yt-image img'
            ) as HTMLImageElement | null;

            if (img && img.src && img.src.includes('i.ytimg.com')) {
                return img.src; // Clean hit
            }

            // 2. LAZY-LOAD FALLBACK: Extract Video ID from the link and build the URL manually
            const watchLink = element.querySelector('a[href*="/watch?v="]') as HTMLAnchorElement | null;
            if (watchLink) {
                try {
                    // Safely parse the URL to get the 'v' parameter
                    const urlObj = new URL(watchLink.href, window.location.origin);
                    const videoId = urlObj.searchParams.get('v');
                    if (videoId) {
                        // Return standard YouTube high-res thumbnail path
                        return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                    }
                } catch (e) {
                    console.error("Failed to parse YouTube URL:", e);
                }
            }

            return null;
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
                                if (candidateSection instanceof HTMLElement) {
                                    candidateSection.style.display = 'none';
                                }

                            }

                            // Evaluation B: Standard Grid Item
                            if (candidateItem && isStandardVideoCard(candidateItem)) {
                                const title = candidateItem.querySelector('.ytLockupMetadataViewModelTitle span')?.textContent || 'Unknown Title';

                                // Use the bulletproof helper function
                                const thumbnailUrl = getThumbnailUrl(candidateItem);

                                if (thumbnailUrl) {
                                    console.log(`🖼️ Extracted Thumbnail for "${title.substring(0, 20)}...":`, thumbnailUrl);
                                } else {
                                    console.log(`⚠️ Could not extract thumbnail for: "${title}"`);
                                }

                                // Keyword filtering logic
                                const visibleText = candidateItem.textContent || '';
                                const targetRegex = /bangladesh|pakistan|hindu|muslim|islam|sanatan|hinduism|buddhist|christian|atheist|atheism/i;

                                if (targetRegex.test(visibleText) && candidateItem instanceof HTMLElement) {
                                    candidateItem.style.borderLeft = '4px solid rgba(255, 77, 77, 1)';
                                    candidateItem.style.borderRadius = '10px';
                                    candidateItem.style.opacity = '0.05';
                                    candidateItem.style.pointerEvents = 'none';
                                    candidateItem.style.cursor = 'not-allowed';
                                }
                            }

                            // Evaluation C: Search Result Video Entry
                            if (candidateSearch && isSearchResultVideo(candidateSearch)) {
                                // Safely grab the title text from the search layout configuration structure
                                const title = candidateSearch.querySelector('#video-title a, #video-title')?.getAttribute('title') ||
                                    candidateSearch.querySelector('#video-title yt-formatted-string')?.textContent || 'Unknown Search Title';
                                console.log(`🔍 Search Result Video Intercepted: "${title.trim()}"`, candidateSearch);
                                // Actions...

                                const visibleText = candidateSearch.textContent || '';
                                const targetRegex = /bangladesh|pakistan|hindu|muslim|islam|sanatan|hinduism|buddhist|christian|atheist|atheism/i;
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