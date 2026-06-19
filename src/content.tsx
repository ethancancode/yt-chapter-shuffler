import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useShufflerStore, Chapter } from './shufflerStore';
import { ShufflerPills } from './components/ShufflerPills';
import { QueueWindow } from './components/QueueWindow';

const ShufflerApp: React.FC = () => {
    const masterChaptersList = useShufflerStore((state) => state.masterChaptersList);
    const isQueueOpen = useShufflerStore((state) => state.isQueueListOpen);

    React.useEffect(() => {
        const container = document.getElementById('yt-shuffler-panel-container');
        if (container) {
            if (isQueueOpen) {
                container.setAttribute('data-queue-open', 'true');
            } else {
                container.removeAttribute('data-queue-open');
            }
        }
    }, [isQueueOpen]);

    if (!masterChaptersList || masterChaptersList.length === 0) {
        return null;
    }

    return (
        <div id="yt-shuffler-extension-root" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <ShufflerPills />
            {isQueueOpen && <QueueWindow />}
        </div>
    );
};

let reactRoot: Root | null = null;
let currentLoadedVideoId: string | null = null;

function getCurrentVideoId(): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
}

function scrapeChapters(): Chapter[] {
    const scrapedChapters: Chapter[] = [];
    const seenTimes = new Set<number>();

    const chaptersPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"]'); // check engagement panel list
    if (chaptersPanel) {
        const uiChapters = chaptersPanel.querySelectorAll('ytd-macro-markers-list-item-renderer');
        uiChapters.forEach(item => {
            const link = item.querySelector('a[href*="t="]');
            const titleElem = item.querySelector('.macro-markers');
            if (link && titleElem) {
                const href = link.getAttribute('href');
                const match = href?.match(/t=(\d+)/);
                if (match) {
                    const time = parseInt(match[1], 10);
                    const title = titleElem.getAttribute('title') || (titleElem as HTMLElement).innerText.trim();
                    if (!seenTimes.has(time)) {
                        seenTimes.add(time);
                        scrapedChapters.push({ time, title });
                    }
                }
            }
        });
    }

    if (scrapedChapters.length === 0) { // search chapters in description
        const timeLinks = document.querySelectorAll('a[href*="t="], a[href*="&t="]');
        timeLinks.forEach(link => {
            const isInsideMetadata = link.closest('#description-inline-expander, #structured-description, ytd-expandable-video-description-body-renderer, ytd-engagement-panel-section-list-renderer');
            if (!isInsideMetadata) return;

            const href = link.getAttribute('href');
            const match = href?.match(/[?&]t=(\d+)/);

            if (match) {
                const timeInSeconds = parseInt(match[1], 10);
                let title = "";
                if (link.nextSibling && link.nextSibling.textContent) {
                    title = link.nextSibling.textContent.replace(/^[\s\-:|>=]+/, '').trim();
                }

                if (!title) {
                    const parentLine = link.closest('span, div')?.textContent || "";
                    title = parentLine.replace(link.textContent || "", "").replace(/^[\s\-:|>=]+/, '').trim();
                }

                if (title.toLowerCase().includes("view") || title.toLowerCase().includes("subscribe") || title.length > 100) {
                    title = "";
                }

                if (!title) {
                    title = `Chapter ${scrapedChapters.length + 1}`;
                }

                if (!seenTimes.has(timeInSeconds)) {
                    seenTimes.add(timeInSeconds);
                    scrapedChapters.push({ time: timeInSeconds, title });
                }
            }
        });
    }

    if (scrapedChapters.length > 0 && !seenTimes.has(0)) { // add a 0:00 chapter if missing
        let zeroTitle = "";

        const firstMarker = document.querySelector( // check first marker from panel
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"] ytd-macro-markers-list-item-renderer:first-child'
        );
        if (firstMarker) {
            const titleElem = firstMarker.querySelector('.macro-markers');
            if (titleElem) {
                zeroTitle = titleElem.getAttribute('title') || (titleElem as HTMLElement).innerText.trim();
            }
        }

        if (!zeroTitle) { // check chapter name shown under the player
            const chapterTitle = document.querySelector('.ytp-chapter-title-content');
            if (chapterTitle && (chapterTitle as HTMLElement).innerText.trim()) {
                const video = document.querySelector('video');
                if (video && video.currentTime < 5) {
                    zeroTitle = (chapterTitle as HTMLElement).innerText.trim();
                }
            }
        }

        if (zeroTitle) {
            seenTimes.add(0); // add 0:00 timestamp
            scrapedChapters.push({ time: 0, title: zeroTitle });
        } else {
            scrapedChapters.sort((a, b) => a.time - b.time);
            const earliest = scrapedChapters[0];
            earliest.time = 0; // force earliest chapter to start at 0
        }
    }

    scrapedChapters.sort((a, b) => a.time - b.time);
    return scrapedChapters;
}

function monitorTrackBoundaries() {
    const video = document.querySelector('video');
    const store = useShufflerStore.getState();
    const activeVideoId = getCurrentVideoId();

    if (!activeVideoId) return;

    const scraped = scrapeChapters();

    if (scraped.length > 0) {
        currentLoadedVideoId = activeVideoId;

        const currentSignature = scraped.map(c => c.time).join(',');
        const masterSignature = store.masterChaptersList.map(c => c.time).join(',');

        if (currentSignature !== masterSignature) {
            store.setMasterChapters(scraped);
        }
    } else {
        if (currentLoadedVideoId !== activeVideoId && store.masterChaptersList.length > 0) {
            currentLoadedVideoId = activeVideoId;
            store.resetStore();
            return;
        }
    }

    if (!video || store.masterChaptersList.length === 0) return;
    const currentTime = video.currentTime;

    if (store.isShuffleActive && !video.paused && store.currentQueueIndex > 0) { // handle user dragging timeline bar manually
        const activePlayingChapter = store.shuffledQueue[store.currentQueueIndex - 1];
        if (activePlayingChapter) {
            const idxInMaster = store.masterChaptersList.findIndex(c => c.time === activePlayingChapter.time);
            const activeChapterEnd = store.masterChaptersList[idxInMaster + 1]?.time || video.duration;

            if (currentTime < activePlayingChapter.time - 2 || currentTime > activeChapterEnd) {
                const targetChapter = [...store.masterChaptersList].reverse().find(c => c.time <= currentTime);
                if (targetChapter) {
                    (store as any).moveChapterBelowActive(targetChapter.time);
                    return;
                }
            }
        }
    }

    if (video.paused) return;

    const currentChapter = [...store.masterChaptersList].reverse().find(c => c.time <= currentTime);

    if (currentChapter !== undefined) {
        if (store.isShuffleActive) {
            const expectedIndex = store.currentQueueIndex - 1;
            const actualQueueIndex = store.shuffledQueue.findIndex(c => c.time === currentChapter.time);

            if (actualQueueIndex !== -1 && actualQueueIndex !== expectedIndex) {
                store.handleNativeTimelineSkip(actualQueueIndex, expectedIndex);
            }
        }

        const idx = store.masterChaptersList.findIndex(c => c.time === currentChapter.time);
        const currentChapterEnd = store.masterChaptersList[idx + 1]?.time || video.duration;

        if (currentChapterEnd - currentTime <= 1.0) {
            if (store.stateLoopActive) {
                video.currentTime = currentChapter.time;
            } else if (store.isShuffleActive) {
                store.executeTrackJump();
            }
        }
    }
}

function injectReactUI() {
    if (document.getElementById('yt-shuffler-panel-container')) return;

    const targetContainer = document.querySelector('#movie_player');
    if (!targetContainer) return;

    const wrapperBlock = document.createElement('div');
    wrapperBlock.id = 'yt-shuffler-panel-container';

    wrapperBlock.style.position = 'absolute';
    wrapperBlock.style.left = '20px';
    wrapperBlock.style.top = '20px';
    wrapperBlock.style.zIndex = '2999';
    wrapperBlock.style.width = 'max-content';

    wrapperBlock.style.background = 'transparent';
    wrapperBlock.style.border = 'none';
    wrapperBlock.style.boxShadow = 'none';
    wrapperBlock.style.pointerEvents = 'auto';

    targetContainer.appendChild(wrapperBlock);

    reactRoot = createRoot(wrapperBlock);
    reactRoot.render(<ShufflerApp />);
}

const layoutObserver = new MutationObserver(() => {
    const targetSpace = document.querySelector('#secondary-inner') || document.querySelector('#columns ytd-watch-flexy');
    if (targetSpace) {
        injectReactUI();
    }
});
layoutObserver.observe(document.body, { childList: true, subtree: true });

const shufflerIntervalID = setInterval(monitorTrackBoundaries, 500);

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "NEW_VIDEO_LOADED") {
        const existingUI = document.getElementById('yt-shuffler-panel-container');
        if (existingUI) {
            if (reactRoot) {
                reactRoot.unmount();
                reactRoot = null;
            }
            existingUI.remove();
        }
        useShufflerStore.getState().resetStore();
    }
});