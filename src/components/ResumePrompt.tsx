import React, { useEffect } from 'react';
import { useShufflerStore } from '../shufflerStore';

export const ResumePrompt: React.FC = () => {
    const pendingResumeQueue = useShufflerStore((state) => state.pendingResumeQueue);
    const setPendingResumeQueue = useShufflerStore((state) => state.setPendingResumeQueue);
    const restoreSavedSessionQueue = useShufflerStore((state) => state.restoreSavedSessionQueue);
    const generateSmartQueue = useShufflerStore((state) => state.generateSmartQueue);

    // auto-dismiss after 8 seconds and generate a fresh shuffle
    useEffect(() => {
        if (!pendingResumeQueue) return;
        const timer = setTimeout(() => {
            setPendingResumeQueue(null);
            generateSmartQueue();
        }, 8000);
        return () => clearTimeout(timer);
    }, [pendingResumeQueue]);

    if (!pendingResumeQueue) return null;

    const handleResume = () => {
        restoreSavedSessionQueue(pendingResumeQueue.queue, pendingResumeQueue.currentIndex);
        setPendingResumeQueue(null);
    };

    const handleNewShuffle = () => {
        setPendingResumeQueue(null);
        generateSmartQueue();
    };

    const handleDismiss = () => {
        setPendingResumeQueue(null);
    };

    return (
        <div
            id="shuffler-resume-prompt"
            className="flex items-center gap-3 py-2 px-3.5 rounded-full bg-[#0f0f0f] border border-[rgba(255,255,255,0.15)] shadow-[0_4px_24px_rgba(0,0,0,0.8)] text-[#f1f1f1] text-[13px] animate-fadeIn"
            style={{ width: 'max-content', pointerEvents: 'auto' }}
        >
            <div className="flex items-center gap-2 font-medium">
                <svg width="16" height="16" className="fill-[#ff4e4e] shrink-0" viewBox="0 0 24 24">
                    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 18 7.41V10h2V4h-6zm.38 9.61l-1.41 1.41 3.17 3.17L14.5 20H20v-6l-2.04 2.04-3.08-3.43z" />
                </svg>
                <span>Resume previous shuffle?</span>
            </div>

            <div className="flex items-center gap-1.5 ml-1">
                <button
                    onClick={handleResume}
                    className="px-2.5 py-1 rounded-full bg-[#ff4e4e] text-white text-[12px] font-medium cursor-pointer hover:bg-[#ff3333] transition-colors border-none outline-none"
                >
                    Resume
                </button>
                <button
                    onClick={handleNewShuffle}
                    className="px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.1)] text-[#ddd] text-[12px] font-medium cursor-pointer hover:bg-[rgba(255,255,255,0.2)] transition-colors border-none outline-none"
                >
                    New Shuffle
                </button>
                <button
                    onClick={handleDismiss}
                    className="p-1 rounded-full text-[#888] hover:text-white cursor-pointer transition-colors border-none outline-none bg-transparent flex items-center justify-center"
                    title="Dismiss"
                >
                    <svg width="14" height="14" className="fill-current" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};
