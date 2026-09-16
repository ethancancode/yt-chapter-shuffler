import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import '../style.css';
import { useShufflerStore, Chapter, SavedPreset } from './shufflerStore';
import { ShufflerPills } from './components/ShufflerPills';
import { QueueWindow } from './components/QueueWindow';
import { ResumePrompt } from './components/ResumePrompt';

const ShufflerApp: React.FC = () => {
    const masterChaptersList = useShufflerStore((state) => state.masterChaptersList);
    const isQueueOpen = useShufflerStore((state) => state.isQueueListOpen);
    const pendingResumeQueue = useShufflerStore((state) => state.pendingResumeQueue);

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
            {pendingResumeQueue ? <ResumePrompt /> : <ShufflerPills />}
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
    const activeVideoId = getCurrentVideoId();

    const watchFlexy = document.querySelector('ytd-watch-flexy');
    if (!watchFlexy) return [];

    // Ensure the DOM element matches the active video ID to prevent scraping previous video during SPA navigation
    const domVideoId = watchFlexy.getAttribute('video-id');
    if (activeVideoId && domVideoId && domVideoId !== activeVideoId) {
        return [];
    }

    const chaptersPanel = watchFlexy.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"]'); // check engagement panel list
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
        const timeLinks = watchFlexy.querySelectorAll('a[href*="t="], a[href*="&t="]');
        timeLinks.forEach(link => {
            const isInsideMetadata = link.closest('#description-inline-expander, #structured-description, ytd-expandable-video-description-body-renderer');
            const isInsideAutoComponent = link.closest('ytd-macro-markers-list-item-renderer, ytd-horizontal-card-list-renderer, ytd-video-description-infocards-section-renderer, #infocards-section');
            if (!isInsideMetadata || isInsideAutoComponent) return; // ignore auto generated components

            const href = link.getAttribute('href');
            const match = href?.match(/[?&]t=(\d+)/);

            if (match) {
                const timeInSeconds = parseInt(match[1], 10);
                let title = "";

                let container = link.parentElement;
                while (container && container.textContent?.trim() === link.textContent?.trim() && container.tagName !== 'BODY') {
                    container = container.parentElement;
                }

                if (container && container.textContent) {
                    const lines = container.textContent.split('\n');
                    const targetLine = lines.find(l => l.includes(link.textContent || ""));
                    if (targetLine) {
                        // Strip all timestamp patterns (like 0:00, 5:18, 00:00:00), dashes, colons from the title
                        title = targetLine
                            .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, '')
                            .replace(/^[\s\-:|>=~.]+/, '')
                            .replace(/[\s\-:|>=~.]+$/, '')
                            .trim();
                    }
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

        const firstMarker = watchFlexy.querySelector( // check first marker from panel
            'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-macro-markers-description-chapters"] ytd-macro-markers-list-item-renderer:first-child'
        );
        if (firstMarker) {
            const titleElem = firstMarker.querySelector('.macro-markers');
            if (titleElem) {
                zeroTitle = titleElem.getAttribute('title') || (titleElem as HTMLElement).innerText.trim();
            }
        }

        if (!zeroTitle) { // check chapter name shown under the player
            const chapterTitle = watchFlexy.querySelector('.ytp-chapter-title-content') || document.querySelector('.ytp-chapter-title-content');
            if (chapterTitle && (chapterTitle as HTMLElement).innerText.trim()) {
                const video = watchFlexy.querySelector('video') || document.querySelector('video');
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

    // a video needs at least 2 chapters to be a shuffleable playlist/album
    if (scrapedChapters.length < 2) {
        return [];
    }

    return scrapedChapters;
}

function detectIsMusicVideo(): boolean {
    const genreMeta = document.querySelector('meta[itemprop="genre"]');
    if (genreMeta?.getAttribute('content')?.toLowerCase() === 'music') {
        return true;
    }

    // YouTube Content ID music attribution cards section
    if (document.querySelector('ytd-horizontal-card-list-renderer yt-video-attribute-view-model')) {
        return true;
    }

    const title = document.title.toLowerCase();
    const keywords = ['full album', 'tracklist', 'soundtrack', 'ost', 'dj mix', 'setlist'];
    if (keywords.some(kw => title.includes(kw))) {
        return true;
    }

    return false;
}

let isNavigating = false;
let isSpaNavigation = false;
let autoShuffleHandledForVideo: string | null = null;

document.addEventListener('yt-navigate-start', () => {
    isNavigating = true;
    isSpaNavigation = true;
    currentLoadedVideoId = null;
    autoShuffleHandledForVideo = null;
    useShufflerStore.getState().resetStore();
    const existingUI = document.getElementById('yt-shuffler-panel-container');
    if (existingUI) {
        if (reactRoot) {
            reactRoot.unmount();
            reactRoot = null;
        }
        existingUI.remove();
    }
});

document.addEventListener('yt-navigate-finish', () => {
    isNavigating = false;
    monitorTrackBoundaries();
});

// Intercept video play event as early as possible
document.addEventListener('play', (e) => {
    const target = e.target as HTMLElement;
    if (target?.tagName === 'VIDEO') {
        const store = useShufflerStore.getState();
        const activeVid = getCurrentVideoId();
        if (store.isAutoShuffleEnabled && !store.isShuffleActive && activeVid && autoShuffleHandledForVideo !== activeVid) {
            monitorTrackBoundaries();
        }
    }
}, true);

function monitorTrackBoundaries() {
    if (isNavigating) return;

    const video = document.querySelector('video');
    const store = useShufflerStore.getState();
    const activeVideoId = getCurrentVideoId();

    if (!activeVideoId) return;

    const watchFlexy = document.querySelector('ytd-watch-flexy');
    const domVideoId = watchFlexy?.getAttribute('video-id');

    if (domVideoId && domVideoId !== activeVideoId) return; // wait for dom to catch up to url change

    const scraped = scrapeChapters();

    if (scraped.length > 0) {
        currentLoadedVideoId = activeVideoId;

        const currentSignature = scraped.map(c => c.time).join(',');
        const masterSignature = store.masterChaptersList.map(c => c.time).join(',');

        if (currentSignature !== masterSignature) {
            store.setMasterChapters(scraped);
            // load saved presets for this video from chrome storage
            chrome.storage.local.get([`presets_${activeVideoId}`], (result) => {
                const presets = (result[`presets_${activeVideoId}`] as SavedPreset[]) ?? [];
                useShufflerStore.getState().setSavedPresets(presets);
            });

            // check if there is an existing session queue from earlier for THIS video
            const savedSession = sessionStorage.getItem(`active_queue_${activeVideoId}`);
            let hasSavedSession = false;
            let parsedSession: { queue: Chapter[]; currentIndex: number } | null = null;

            if (savedSession) {
                try {
                    const parsed = JSON.parse(savedSession);
                    if (parsed?.queue && parsed.queue.length > 0) {
                        hasSavedSession = true;
                        parsedSession = parsed;
                    }
                } catch (e) { }
            }

            if (hasSavedSession && parsedSession) {
                if (isSpaNavigation) {
                    // Coming back to this video from another video: ask user via sleek prompt
                    useShufflerStore.getState().setPendingResumeQueue(parsedSession);
                    autoShuffleHandledForVideo = activeVideoId;
                } else if (store.isKeepPlaylistOnRefreshEnabled) {
                    // Simple page reload (F5): keep the existing playlist directly
                    useShufflerStore.getState().restoreSavedSessionQueue(parsedSession.queue, parsedSession.currentIndex ?? 0);
                    autoShuffleHandledForVideo = activeVideoId;
                }
            } else if (store.isAutoShuffleEnabled && !store.isShuffleActive && detectIsMusicVideo()) {
                // No saved queue: trigger standard smart shuffle
                autoShuffleHandledForVideo = activeVideoId;
                useShufflerStore.getState().generateSmartQueue();
            }
        }
    } else {
        if (store.masterChaptersList.length > 0 || store.isShuffleActive) {
            currentLoadedVideoId = activeVideoId;
            store.resetStore();
            const existingUI = document.getElementById('yt-shuffler-panel-container');
            if (existingUI) {
                if (reactRoot) {
                    reactRoot.unmount();
                    reactRoot = null;
                }
                existingUI.remove();
            }
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
                    store.moveChapterBelowActive(targetChapter.time);
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

        const fadeThreshold = (store.isAudioFadeEnabled && store.fadeDuration > 1) ? store.fadeDuration : 1.0;
        if (currentChapterEnd - currentTime <= fadeThreshold && !store.isFadingOut) {
            if (store.stateLoopActive || store.isShuffleActive) {
                if (store.isAudioFadeEnabled) {
                    store.setIsFadingOut(true);
                    const savedVolume = video.volume;
                    store.setOriginalVolume(savedVolume);

                    const remainingTime = currentChapterEnd - currentTime;
                    const effectiveFade = Math.min(store.fadeDuration, remainingTime);
                    const fadeDuration = effectiveFade * 1000; // convert seconds to ms
                    const steps = 20;
                    const stepTime = fadeDuration / steps;
                    const volumeStep = savedVolume / steps;
                    let currentVol = savedVolume;

                    let fadeOutInterval: number | null = null;
                    fadeOutInterval = window.setInterval(() => {
                        currentVol = Math.max(0, currentVol - volumeStep);
                        video.volume = currentVol;
                        if (currentVol <= 0.05) {
                            if (fadeOutInterval !== null) {
                                clearInterval(fadeOutInterval);
                                fadeOutInterval = null;
                            }
                            store.setIsFadingOut(false);
                            video.volume = 0;
                            if (store.stateLoopActive) {
                                video.currentTime = currentChapter.time;
                                video.volume = savedVolume;
                            } else if (store.isShuffleActive) {
                                store.executeTrackJump();
                            }
                        }
                    }, stepTime);
                } else {
                    if (store.stateLoopActive) {
                        video.currentTime = currentChapter.time;
                    } else if (store.isShuffleActive) {
                        store.executeTrackJump();
                    }
                }
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
    const store = useShufflerStore.getState();
    const activeVid = getCurrentVideoId();
    if (store.isAutoShuffleEnabled && !store.isShuffleActive && activeVid && autoShuffleHandledForVideo !== activeVid) {
        monitorTrackBoundaries();
    }
});
layoutObserver.observe(document.body, { childList: true, subtree: true });

const shufflerIntervalID = setInterval(monitorTrackBoundaries, 500);

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
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

    if (request.action === "GET_CURRENT_QUEUE") { // popup asking for the active shuffled queue
        const { shuffledQueue } = useShufflerStore.getState();
        sendResponse({ queue: shuffledQueue });
    }
});

chrome.storage.local.get(['isAudioFadeEnabled', 'fadeDuration', 'isAutoShuffleEnabled', 'isKeepPlaylistOnRefreshEnabled'], (result) => {
    if (result.isAudioFadeEnabled !== undefined) {
        useShufflerStore.getState().setAudioFadeEnabled(result.isAudioFadeEnabled as boolean);
    }
    if (result.fadeDuration !== undefined) {
        useShufflerStore.getState().setFadeDuration(result.fadeDuration as number);
    }
    if (result.isAutoShuffleEnabled !== undefined) {
        useShufflerStore.getState().setAutoShuffleEnabled(result.isAutoShuffleEnabled as boolean);
    }
    if (result.isKeepPlaylistOnRefreshEnabled !== undefined) {
        useShufflerStore.getState().setKeepPlaylistOnRefreshEnabled(result.isKeepPlaylistOnRefreshEnabled as boolean);
    }
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        if (changes.isAudioFadeEnabled) {
            useShufflerStore.getState().setAudioFadeEnabled(changes.isAudioFadeEnabled.newValue as boolean);
        }
        if (changes.fadeDuration) {
            useShufflerStore.getState().setFadeDuration(changes.fadeDuration.newValue as number);
        }
        if (changes.isAutoShuffleEnabled) {
            useShufflerStore.getState().setAutoShuffleEnabled(changes.isAutoShuffleEnabled.newValue as boolean);
        }
        if (changes.isKeepPlaylistOnRefreshEnabled) {
            useShufflerStore.getState().setKeepPlaylistOnRefreshEnabled(changes.isKeepPlaylistOnRefreshEnabled.newValue as boolean);
        }
        const activeVideoId = getCurrentVideoId();
        if (activeVideoId && changes[`presets_${activeVideoId}`]) {
            useShufflerStore.getState().setSavedPresets((changes[`presets_${activeVideoId}`].newValue as SavedPreset[]) ?? []);
        }
    }
});