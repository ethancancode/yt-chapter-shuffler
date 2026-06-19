import { create } from 'zustand';

export interface Chapter {
    time: number;
    title: string;
}

interface ShufflerState {
    masterChaptersList: Chapter[];
    shuffledQueue: Chapter[];
    excludedTimes: Set<number>;
    currentQueueIndex: number;
    isShuffleActive: boolean;
    isQueueListOpen: boolean;
    draggedItemIndex: number | null;
    isDraggingPlaybackArrow: boolean;
    stateLoopActive: boolean;
    statePlaylistLoopActive: boolean;
    stateReshuffleOnLoopActive: boolean;

    setMasterChapters: (chapters: Chapter[]) => void;
    setQueueOpen: (isOpen: boolean) => void;
    setLoopActive: (active: boolean) => void;
    setPlaylistLoopActive: (active: boolean) => void;
    setReshuffleOnLoopActive: (active: boolean) => void;
    setDraggingPlaybackArrow: (isDragging: boolean) => void;
    setDraggedItemIndex: (idx: number | null) => void;
    toggleTrackExclusion: (time: number) => void;
    generateSmartQueue: () => void;
    jumpToQueueIndex: (index: number) => void;
    executeTrackJump: () => void;
    handleNativeTimelineSkip: (actualQueueIndex: number, expectedIndex: number) => void;
    handleManualReorder: (draggedIdx: number, targetIdx: number) => void;
    resetStore: () => void;
}

export const useShufflerStore = create<ShufflerState>((set, get) => ({
    masterChaptersList: [],
    shuffledQueue: [],
    excludedTimes: new Set<number>(),
    currentQueueIndex: -1,
    isShuffleActive: false,
    isQueueListOpen: false,
    draggedItemIndex: null,
    isDraggingPlaybackArrow: false,

    stateLoopActive: false,
    statePlaylistLoopActive: false,
    stateReshuffleOnLoopActive: false,

    setMasterChapters: (chapters) => set({ masterChaptersList: chapters }),
    setQueueOpen: (isOpen) => set({ isQueueListOpen: isOpen }),

    setLoopActive: (active) => set({ stateLoopActive: active }),
    setPlaylistLoopActive: (active) => set({ statePlaylistLoopActive: active }),

    setReshuffleOnLoopActive: (active) => set({ stateReshuffleOnLoopActive: active }),
    setDraggingPlaybackArrow: (isDragging) => set({ isDraggingPlaybackArrow: isDragging }),
    setDraggedItemIndex: (idx) => set({ draggedItemIndex: idx }),

    toggleTrackExclusion: (time) => set((state) => {
        const nextExclusions = new Set(state.excludedTimes);
        if (nextExclusions.has(time)) {
            nextExclusions.delete(time);
        } else {
            nextExclusions.add(time);
        }
        return {
            excludedTimes: nextExclusions
        };
    }),

    generateSmartQueue: () => {
        const { masterChaptersList, excludedTimes } = get();
        let allowedChapters = masterChaptersList.filter(c => !excludedTimes.has(c.time));
        if (allowedChapters.length === 0) return;

        let queue = [...allowedChapters];
        for (let i = queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue[i], queue[j]] = [queue[j], queue[i]];
        }

        set({ shuffledQueue: queue, currentQueueIndex: 0, isShuffleActive: true });
        get().executeTrackJump();
    },

    jumpToQueueIndex: (index) => {
        const { shuffledQueue } = get();
        if (index < 0 || index >= shuffledQueue.length) return;
        set({ currentQueueIndex: index });
        get().executeTrackJump();
    },

    executeTrackJump: () => {
        const { shuffledQueue, currentQueueIndex, excludedTimes, statePlaylistLoopActive, stateReshuffleOnLoopActive, generateSmartQueue } = get();
        if (shuffledQueue.length === 0) return;

        let nextIndex = currentQueueIndex;
        while (nextIndex < shuffledQueue.length && excludedTimes.has(shuffledQueue[nextIndex].time)) {
            nextIndex++;
        }

        if (nextIndex >= shuffledQueue.length) {
            if (statePlaylistLoopActive) {
                if (stateReshuffleOnLoopActive) {
                    generateSmartQueue();
                    return;
                } else {
                    nextIndex = 0;
                    while (nextIndex < shuffledQueue.length && excludedTimes.has(shuffledQueue[nextIndex].time)) {
                        nextIndex++;
                    }
                    if (nextIndex >= shuffledQueue.length) {
                        set({ isShuffleActive: false });
                        return;
                    }
                }
            } else {
                set({ isShuffleActive: false });
                return;
            }
        }

        const targetChapter = shuffledQueue[nextIndex];
        set({ currentQueueIndex: nextIndex + 1 });

        const video = document.querySelector('video');
        if (video) {
            video.currentTime = targetChapter.time;
            if (video.paused) {
                video.play().catch(() => { });
            }
        }

        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('v');
        if (!videoId) return;

        const detailElement = document.querySelector('ytd-watch-flexy') as any;
        if (detailElement && detailElement.emit) {
            detailElement.emit('yt-navigate', {
                endpoint: { watchEndpoint: { videoId: videoId, startTimeSeconds: targetChapter.time } }
            });
        }
    },

    handleNativeTimelineSkip: (actualQueueIndex, expectedIndex) => {
        const { shuffledQueue } = get();
        let queueCopy = [...shuffledQueue];
        const [clickedElement] = queueCopy.splice(actualQueueIndex, 1);

        let targetPlacementIndex = expectedIndex + 1;
        if (actualQueueIndex < expectedIndex) {
            targetPlacementIndex = expectedIndex;
        }

        queueCopy.splice(targetPlacementIndex, 0, clickedElement);
        set({ shuffledQueue: queueCopy, currentQueueIndex: targetPlacementIndex + 1 });
    },

    handleManualReorder: (draggedIdx, targetIdx) => {
        const { shuffledQueue, currentQueueIndex } = get();
        if (draggedIdx === targetIdx) {
            set({ draggedItemIndex: null, isDraggingPlaybackArrow: false });
            return;
        }

        let queueCopy = [...shuffledQueue];
        const [movedElement] = queueCopy.splice(draggedIdx, 1);
        queueCopy.splice(targetIdx, 0, movedElement);

        let nextQueueIndex = currentQueueIndex;
        const playingIndex = currentQueueIndex - 1;

        if (draggedIdx === playingIndex) {
            nextQueueIndex = targetIdx + 1;
        } else if (draggedIdx < playingIndex && targetIdx >= playingIndex) {
            nextQueueIndex--;
        } else if (draggedIdx > playingIndex && targetIdx <= playingIndex) {
            nextQueueIndex++;
        }

        set({
            shuffledQueue: queueCopy,
            currentQueueIndex: nextQueueIndex,
            draggedItemIndex: null,
            isDraggingPlaybackArrow: false
        });
    },

    moveChapterBelowActive: (targetChapterTime: number) => set((state) => {
        const queue = [...state.shuffledQueue];
        if (queue.length === 0) return {};
        const previousActiveIdx = state.currentQueueIndex - 1; //  find where the previously playing chapter is located
        const targetIdx = queue.findIndex(c => c.time === targetChapterTime);  // find where the newly tapped chapter currently lives
        if (targetIdx === -1 || targetIdx === previousActiveIdx + 1 || targetIdx === previousActiveIdx) {
            return {};
        } // if not found/already there then skip

        const [movedChapter] = queue.splice(targetIdx, 1); // remove clicked chapter from list

        let insertAt = previousActiveIdx + 1; // find where to put it back depending on if it was before or after
        if (targetIdx < previousActiveIdx) {
            insertAt = previousActiveIdx;
        }

        queue.splice(insertAt, 0, movedChapter);  // put it right under the currently playing track

        return {
            shuffledQueue: queue,
            currentQueueIndex: insertAt + 1 // update the play pointer index to follow the moved track
        };
    }),

    resetStore: () => set({
        masterChaptersList: [],
        shuffledQueue: [],
        excludedTimes: new Set<number>(),
        currentQueueIndex: -1,
        isShuffleActive: false,
        isQueueListOpen: false
    })
}));