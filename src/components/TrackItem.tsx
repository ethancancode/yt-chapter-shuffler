import React from 'react';
import { useShufflerStore, Chapter } from '../shufflerStore';

interface TrackItemProps {
    chapter: Chapter;
    index: number;
}

export const TrackItem: React.FC<TrackItemProps> = ({ chapter, index }) => {
    const currentQueueIndex = useShufflerStore((state) => state.currentQueueIndex);
    const draggedItemIndex = useShufflerStore((state) => state.draggedItemIndex);
    const isDraggingPlaybackArrow = useShufflerStore((state) => state.isDraggingPlaybackArrow);
    const excludedTimes = useShufflerStore((state) => state.excludedTimes);

    const setDraggedItemIndex = useShufflerStore((state) => state.setDraggedItemIndex);
    const setDraggingPlaybackArrow = useShufflerStore((state) => state.setDraggingPlaybackArrow);
    const handleManualReorder = useShufflerStore((state) => state.handleManualReorder);
    const jumpToQueueIndex = useShufflerStore((state) => state.jumpToQueueIndex);
    const toggleTrackExclusion = useShufflerStore((state) => state.toggleTrackExclusion);

    const playingIndex = currentQueueIndex - 1;
    const isActive = index === playingIndex;
    const isExcluded = excludedTimes.has(chapter.time);

    const totalMinutes = Math.floor(chapter.time / 60);
    const seconds = chapter.time % 60;

    let formattedTime = '';
    if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        formattedTime = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        formattedTime = `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
    }

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (isDraggingPlaybackArrow || isExcluded) return;
        setDraggedItemIndex(index);
        e.currentTarget.classList.add('dragging');
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (isExcluded) return;
        if (isDraggingPlaybackArrow) {
            e.currentTarget.classList.add('arrow-hover-target');
        } else {
            e.currentTarget.classList.add('drag-over');
        }
    };

    return (
        <div
            className={`group flex items-center relative min-h-[34px] py-1.5 pr-[65px] pl-2 select-none box-border rounded transition-all duration-200 gap-2 text-[12px]
                ${isActive ? 'bg-[rgba(255,78,78,0.12)] text-[#ff4e4e] border-l-3 border-[#cc0000]' : 'bg-[rgba(255,255,255,0.02)] text-[#e1e1e1]'} 
                ${draggedItemIndex === index ? 'opacity-30 border border-dashed border-[#cc0000]' : ''}`}
            style={{
                opacity: isExcluded ? 0.35 : undefined,
            }}
            data-index={index}
            onDragOver={handleDragOver}
            onDragLeave={(e) => {
                e.currentTarget.classList.remove('bg-[rgba(255,255,255,0.08)]', 'outline-1', 'outline-dashed', 'outline-[#ff4e4e]');
                e.currentTarget.classList.remove('bg-[rgba(204,0,0,0.15)]', 'border-t-2', 'border-[#cc0000]');
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('bg-[rgba(255,255,255,0.08)]', 'outline-1', 'outline-dashed', 'outline-[#ff4e4e]');
                e.currentTarget.classList.remove('bg-[rgba(204,0,0,0.15)]', 'border-t-2', 'border-[#cc0000]');
                if (draggedItemIndex === null || isExcluded) return;
                if (isDraggingPlaybackArrow) {
                    if (index === playingIndex) return;
                    jumpToQueueIndex(index);
                    setDraggedItemIndex(null);
                    setDraggingPlaybackArrow(false);
                    return;
                }
                handleManualReorder(draggedItemIndex, index);
            }}
            onDragEnd={(e) => {
                e.currentTarget.classList.remove('opacity-30');
                setDraggedItemIndex(null);
                setDraggingPlaybackArrow(false);
            }}
            draggable={draggedItemIndex === index && !isDraggingPlaybackArrow && !isExcluded}
            onDragStart={handleDragStart}
        >
            <div // track title container
                className={`flex items-center gap-2 overflow-hidden flex-1 ${isExcluded ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => {
                    if (!isExcluded) jumpToQueueIndex(index);
                }}
            >
                {isActive ? (
                    <span
                        className="text-[#ff4e4e] cursor-grab select-none shrink-0 text-[14px] pr-0.5 hover:scale-120 transition-transform duration-100"
                        draggable={!isExcluded}
                        onDragStart={(e) => {
                            if (isExcluded) return;
                            setDraggingPlaybackArrow(true);
                            setDraggedItemIndex(playingIndex);
                        }}
                        onDragEnd={() => {
                            setDraggingPlaybackArrow(false);
                            setDraggedItemIndex(null);
                        }}
                        style={{ cursor: isExcluded ? 'not-allowed' : 'grab' }}
                    >
                        ▶
                    </span>
                ) : (
                    <span className={`shrink-0 font-bold ${isActive ? 'text-[#ff8a8a]' : 'text-[#555555]'}`} style={{ textDecoration: isExcluded ? 'line-through' : 'none' }}>
                        {(index + 1).toString().padStart(2, '0')}
                    </span>
                )}

                <div
                    className="truncate flex-1"
                    title={chapter.title}
                    style={{ textDecoration: isExcluded ? 'line-through' : 'none' }}
                >
                    {chapter.title}
                </div>

                <span className={`shrink-0 mr-1 ${isActive ? 'text-[#ff8a8a]' : 'text-[#666666]'}`}>{`(${formattedTime})`}</span>
            </div>

            <span // toggle track on or off
                className={`absolute right-[34px] top-1/2 -translate-y-1/2 z-50 flex items-center justify-center p-1.5 select-none w-6 h-6 cursor-pointer opacity-50 group-hover:opacity-100 hover:scale-115 transition-all duration-150 ${isExcluded ? 'text-[#ff4d4d]' : 'text-[#aaa]'}`}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleTrackExclusion(chapter.time);
                }}
                title={isExcluded ? "Include Chapter" : "Exclude Chapter"}
            >
                <svg style={{ width: '14px', height: '14px', fill: 'currentColor', pointerEvents: 'none' }} viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
            </span>

            {!isExcluded && ( // drag handle for reordering
                <div
                    className="absolute right-2 top-1/2 -translate-y-1/2 cursor-grab flex p-1 text-[#aaa] hover:text-gray-400 z-40 transition-colors"
                    onMouseDown={() => {
                        if (!isDraggingPlaybackArrow) setDraggedItemIndex(index);
                    }}
                    onMouseUp={() => {
                        if (draggedItemIndex === index) setDraggedItemIndex(null);
                    }}
                >
                    <svg style={{ width: '16px', height: '16px', fill: 'currentColor' }} viewBox="0 0 24 24">
                        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                    </svg>
                </div>
            )}
        </div>
    );
};