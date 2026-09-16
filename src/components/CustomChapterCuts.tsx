import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useShufflerStore } from '../shufflerStore';

export const CustomChapterCuts: React.FC = () => {
    const masterChaptersList = useShufflerStore((state) => state.masterChaptersList);
    const isCustomChapters = useShufflerStore((state) => state.isCustomChapters);

    useEffect(() => {
        // strictly ensure custom chapter cuts only touch the DOM for custom chapters
        if (!isCustomChapters) {
            const chaptersContainer = document.querySelector('.ytp-chapters-container') as HTMLElement;
            if (chaptersContainer && chaptersContainer.getAttribute('data-custom-shuffler') === 'true') {
                chaptersContainer.removeAttribute('data-custom-shuffler');
                chaptersContainer.removeAttribute('data-sig');
            }
            const titleElem = document.querySelector('.ytp-tooltip-progress-bar-pill-title');
            if (titleElem) titleElem.remove();
            return;
        }

        let isMounted = true;

        // 1. render custom segment dividers on timeline for custom chapters
        const updateNativeChaptersDOM = () => {
            if (!isMounted || !isCustomChapters) return;

            const video = document.querySelector('video');
            const chaptersContainer = document.querySelector('.ytp-chapters-container') as HTMLElement;

            if (!chaptersContainer) return;

            if (!video || !video.duration || isNaN(video.duration) || masterChaptersList.length < 2) {
                if (chaptersContainer.getAttribute('data-custom-shuffler') === 'true') {
                    chaptersContainer.removeAttribute('data-custom-shuffler');
                    chaptersContainer.removeAttribute('data-sig');
                }
                return;
            }

            chaptersContainer.setAttribute('data-custom-shuffler', 'true');

            const duration = video.duration;
            const segments: { start: number; end: number; duration: number }[] = [];

            for (let i = 0; i < masterChaptersList.length; i++) {
                const start = masterChaptersList[i].time;
                const end = i < masterChaptersList.length - 1 ? masterChaptersList[i + 1].time : duration;
                const segDur = Math.max(0, end - start);
                if (segDur > 0) {
                    segments.push({ start, end, duration: segDur });
                }
            }

            if (segments.length < 2) return;

            const totalWidth = chaptersContainer.clientWidth || chaptersContainer.offsetWidth || 850;
            const gapSize = 4;
            const totalGapsWidth = (segments.length - 1) * gapSize;
            const availableWidth = Math.max(0, totalWidth - totalGapsWidth);

            let html = '';
            segments.forEach((seg, idx) => {
                const segWidth = (seg.duration / duration) * availableWidth;
                const isLast = idx === segments.length - 1;
                const marginRight = isLast ? '0px' : `${gapSize}px`;

                html += `
                    <div class="ytp-chapter-hover-container ytp-exp-chapter-hover-container" style="width: ${segWidth}px; margin-right: ${marginRight}; flex: ${seg.duration};">
                        <div class="ytp-progress-bar-padding"></div>
                        <div class="ytp-progress-list ${idx === 0 ? 'ytp-progress-bar-start' : ''} ${isLast ? 'ytp-progress-bar-end' : ''}">
                            <div class="ytp-play-progress ytp-swatch-background-color" style="left: 0px; transform: scaleX(0);"></div>
                            <div class="ytp-progress-linear-live-buffer"></div>
                            <div class="ytp-load-progress" style="left: 0px; transform: scaleX(0);"></div>
                            <div class="ytp-hover-progress" style="transform: scaleX(0);"></div>
                            <div class="ytp-ad-progress-list"></div>
                        </div>
                    </div>
                `;
            });

            if (chaptersContainer.getAttribute('data-sig') !== `${duration}_${masterChaptersList.length}_${totalWidth}`) {
                chaptersContainer.setAttribute('data-sig', `${duration}_${masterChaptersList.length}_${totalWidth}`);
                chaptersContainer.innerHTML = html;
            }
        };

        // 2. update red play-progress and gray buffer progress across custom segments in real time
        const updateSegmentProgressBars = () => {
            if (!isMounted || !isCustomChapters) return;
            const video = document.querySelector('video');
            const chaptersContainer = document.querySelector('.ytp-chapters-container');
            if (!video || !chaptersContainer || masterChaptersList.length < 2) return;

            const duration = video.duration;
            if (!duration || isNaN(duration)) return;

            const currentTime = video.currentTime;
            const bufferedEnd = video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0;

            const hoverContainers = chaptersContainer.querySelectorAll('.ytp-chapter-hover-container');
            if (hoverContainers.length === 0) return;

            for (let i = 0; i < masterChaptersList.length; i++) {
                const segStart = masterChaptersList[i].time;
                const segEnd = i < masterChaptersList.length - 1 ? masterChaptersList[i + 1].time : duration;
                const segDur = segEnd - segStart;

                const hoverContainer = hoverContainers[i];
                if (!hoverContainer || segDur <= 0) continue;

                const playProgress = hoverContainer.querySelector('.ytp-play-progress') as HTMLElement;
                const loadProgress = hoverContainer.querySelector('.ytp-load-progress') as HTMLElement;

                // calculate red played scaleX (0 to 1)
                if (playProgress) {
                    let playScale = 0;
                    if (currentTime >= segEnd) {
                        playScale = 1;
                    } else if (currentTime > segStart) {
                        playScale = (currentTime - segStart) / segDur;
                    }
                    playProgress.style.transform = `scaleX(${playScale})`;
                }

                // calculate gray buffer scaleX (0 to 1)
                if (loadProgress) {
                    let loadScale = 0;
                    if (bufferedEnd >= segEnd) {
                        loadScale = 1;
                    } else if (bufferedEnd > segStart) {
                        loadScale = (bufferedEnd - segStart) / segDur;
                    }
                    loadProgress.style.transform = `scaleX(${loadScale})`;
                }
            }
        };

        // 3. update hover thumbnail tooltip with chapter title directly in YouTube's text badge
        const updateHoverTooltip = () => {
            if (!isMounted || !isCustomChapters) return;
            const video = document.querySelector('video');
            if (!video || masterChaptersList.length < 2) return;

            const timeStampElem = document.querySelector('.ytp-tooltip-progress-bar-pill-time-stamp') as HTMLElement;
            if (!timeStampElem) return;

            const timeStr = timeStampElem.textContent?.trim() || '';
            const match = timeStr.match(/^(\d{1,2}:\d{2}(?::\d{2})?)/);
            if (!match) return;

            const parts = match[1].split(':').map(Number);
            let seconds = 0;
            if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
            if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];

            const hoveredChapter = [...masterChaptersList].reverse().find(c => c.time <= seconds);
            if (!hoveredChapter) return;

            const parent = timeStampElem.parentElement;
            if (!parent) return;

            let titleElem = parent.querySelector('.ytp-tooltip-progress-bar-pill-title') as HTMLElement;
            if (!titleElem) {
                titleElem = document.createElement('div');
                titleElem.className = 'ytp-tooltip-progress-bar-pill-title';
                titleElem.style.marginLeft = '6px';
                titleElem.style.overflow = 'hidden';
                titleElem.style.textOverflow = 'ellipsis';
                titleElem.style.whiteSpace = 'nowrap';
                titleElem.style.maxWidth = '180px';
                titleElem.style.display = 'inline-block';
                parent.appendChild(titleElem);
            }

            if (titleElem.textContent !== hoveredChapter.title) {
                titleElem.textContent = hoveredChapter.title;
            }
        };

        const interval = setInterval(() => {
            updateNativeChaptersDOM();
            updateSegmentProgressBars();
            updateHoverTooltip();
        }, 30);

        return () => {
            isMounted = false;
            clearInterval(interval);
            const titleElem = document.querySelector('.ytp-tooltip-progress-bar-pill-title');
            if (titleElem) titleElem.remove();
        };
    }, [masterChaptersList, isCustomChapters]);

    return null;
};
