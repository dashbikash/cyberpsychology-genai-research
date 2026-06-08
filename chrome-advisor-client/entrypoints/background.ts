export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // 1. Triggered when the browser starts loading a main page
  browser.webNavigation.onBeforeNavigate.addListener((details) => {
    // Filter out subframes (like iframes) to only capture the main page
    if (details.frameId === 0) {
      console.log(`Main page started loading: ${details.url}`);
    }
  });

  // 2. Triggered when the DOM is fully loaded, but before images/stylesheets
  browser.webNavigation.onDOMContentLoaded.addListener((details) => {
    if (details.frameId === 0) {
      console.log(`Main page DOM is ready: ${details.url}`);
    }
  });

  // 3. Triggered when the page is completely loaded (including images)
  browser.webNavigation.onCompleted.addListener((details) => {
    if (details.frameId === 0) {
      console.log(`Main page fully loaded: ${details.url}`);
    }
  });

  // This listener is registered immediately when the worker wakes up.
  // Chrome will spin up the worker specifically to run this callback
  // whenever a page starts loading.
  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
      console.log("I woke up because a page started loading!");
    }
  });

});
