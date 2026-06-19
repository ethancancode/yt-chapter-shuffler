import React from 'react';
import { useShufflerStore } from '../shufflerStore';

export const ShufflerPills: React.FC = () => {
    const isShuffleActive = useShufflerStore((state) => state.isShuffleActive); // get state from store
    const isQueueOpen = useShufflerStore((state) => state.isQueueListOpen);

    const generateSmartQueue = useShufflerStore((state) => state.generateSmartQueue);
    const setQueueOpen = useShufflerStore((state) => state.setQueueOpen);

    const btnClass = "inline-flex items-center justify-center bg-[rgba(15,15,15,0.85)] text-[#f1f1f1] border border-[rgba(255,255,255,0.1)] py-1.5 px-3.5 rounded-[18px] font-medium text-[13px] cursor-pointer outline-none normal-case select-none whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.5)] backdrop-blur-[8px] transition-all duration-200 hover:bg-[rgba(40,40,40,0.9)] hover:border-[rgba(255,255,255,0.2)] active:scale-96 active:bg-[rgba(30,30,30,0.9)]";

    return (
        <div className="flex items-center gap-2 mb-1 no-wrap">
            {isShuffleActive ? (
                <div
                    className={btnClass}
                    id="shuffler-action-btn"
                    onClick={() => useShufflerStore.setState({ isShuffleActive: false, isQueueListOpen: false })}
                >
                    <svg width="18" height="18" style={{ marginRight: '8px' }} className="fill-current inline-block align-middle" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                    Disable Shuffle
                </div>
            ) : (
                <div
                    className={`${btnClass} border-[rgba(255,255,255,0.05)]`}
                    id="shuffler-action-btn"
                    onClick={generateSmartQueue}
                >
                    <svg width="18" height="18" style={{ marginRight: '8px' }} className="fill-current inline-block align-middle" viewBox="0 0 24 24">
                        <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 18 7.41V10h2V4h-6zm.38 9.61l-1.41 1.41 3.17 3.17L14.5 20H20v-6l-2.04 2.04-3.08-3.43z" />
                    </svg>
                    Shuffle
                </div>
            )}

            {isShuffleActive && (
                <div
                    className={btnClass}
                    id="shuffler-toggle-view"
                    onClick={() => setQueueOpen(!isQueueOpen)}
                >
                    <svg width="18" height="18" style={{ marginRight: '8px' }} className="fill-current inline-block align-middle" viewBox="0 0 24 24">
                        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z" />
                    </svg>
                    {isQueueOpen ? 'Hide Queue' : 'View Queue'}
                </div>
            )}
        </div>
    );
};