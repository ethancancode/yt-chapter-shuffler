import React from 'react';
import { useShufflerStore } from '../shufflerStore';
import { TrackItem } from './TrackItem';

export const QueueWindow: React.FC = () => {
    const masterChaptersList = useShufflerStore((state) => state.masterChaptersList); // track scraped chapters
    const shuffledQueue = useShufflerStore((state) => state.shuffledQueue);

    const stateLoopActive = useShufflerStore((state) => state.stateLoopActive);
    const statePlaylistLoopActive = useShufflerStore((state) => state.statePlaylistLoopActive);
    const stateReshuffleOnLoopActive = useShufflerStore((state) => state.stateReshuffleOnLoopActive);

    const setLoopActive = useShufflerStore((state) => state.setLoopActive);
    const setPlaylistLoopActive = useShufflerStore((state) => state.setPlaylistLoopActive);
    const setReshuffleOnLoopActive = useShufflerStore((state) => state.setReshuffleOnLoopActive);

    if (!masterChaptersList || masterChaptersList.length === 0) { // exit if no chapters found
        return null;
    }

    return (
        <div 
            id="shuffler-video-queue-list" 
            className="flex flex-col gap-2.5 p-3 w-[320px] max-h-[325px] rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(21,21,21,0.95)] backdrop-blur-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        >
            <div className="overflow-y-auto max-h-[220px] pr-0.5 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[rgba(255,255,255,0.15)] [&::-webkit-scrollbar-thumb]:rounded-[10px]" id="shuffler-tracks-anchor"> {/* scrollable list container */}
                {shuffledQueue.map((chapter, idx) => (
                    <TrackItem
                        key={`${chapter.time}-${idx}`}
                        chapter={chapter}
                        index={idx}
                    />
                ))}
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-[rgba(255,255,255,0.08)]"> {/* control buttons and settings */}
                <div className="flex flex-row items-center justify-between"> {/* main settings row */}
                    <div className="flex items-center h-auto"> {/* shuffle button column */}
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(15, 15, 15, 0.85)',
                                color: '#f1f1f1',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '4px 10px',
                                borderRadius: '14px',
                                fontWeight: 500,
                                fontSize: '11px',
                                cursor: 'pointer',
                                outline: 'none',
                                textTransform: 'none',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                                backdropFilter: 'blur(8px)',
                                transition: 'all 0.2s ease',
                                margin: 0
                            }}
                            onClick={() => useShufflerStore.getState().generateSmartQueue()}
                            title="Reshuffle the playlist"
                        >
                            <svg width="14" height="14" style={{ marginRight: '6px' }} className="fill-current inline-block align-middle" viewBox="0 0 24 24">
                                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 18 7.41V10h2V4h-6zm.38 9.61l-1.41 1.41 3.17 3.17L14.5 20H20v-6l-2.04 2.04-3.08-3.43z" />
                            </svg>
                            Shuffle Again
                        </div>
                    </div>

                    <div className="flex items-center h-5"> {/* repeat playlist column */}
                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-[#aaaaaa] whitespace-nowrap">
                            <input
                                type="checkbox"
                                className="cursor-pointer accent-[#cc0000] m-0"
                                checked={statePlaylistLoopActive}
                                onChange={(e) => setPlaylistLoopActive(e.target.checked)}
                            />
                            <span>Repeat playlist</span>
                        </label>
                    </div>

                    <div className="flex items-center h-5"> {/* repeat chapter column */}
                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-[#aaaaaa] whitespace-nowrap">
                            <input
                                type="checkbox"
                                className="cursor-pointer accent-[#cc0000] m-0"
                                checked={stateLoopActive}
                                onChange={(e) => setLoopActive(e.target.checked)}
                            />
                            <span>Repeat Chapter</span>
                        </label>
                    </div>
                </div>

                {statePlaylistLoopActive && (
                    <div className="flex mt-1 mb-1" style={{ paddingLeft: '144px' }}> {/* show sub-option if repeat playlist is checked */}
                        <label className="flex items-center gap-1 cursor-pointer select-none text-[9.5px] text-[#888888] whitespace-nowrap">
                            <input
                                type="checkbox"
                                className="cursor-pointer accent-[#cc0000] m-0"
                                style={{ transform: 'scale(0.82)', transformOrigin: 'left center' }}
                                checked={stateReshuffleOnLoopActive}
                                onChange={(e) => setReshuffleOnLoopActive(e.target.checked)}
                            />
                            <span>Shuffle when over</span>
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
};