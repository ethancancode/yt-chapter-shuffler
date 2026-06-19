chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { // check if user opened a new video
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
        chrome.tabs.sendMessage(tabId, { action: "NEW_VIDEO_LOADED" }).catch((err) => { // tell content script to reset because video changed
        });
    }
});