import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useShufflerStore, Chapter } from '../shufflerStore';
import { parseTracklistText, parseTimeToSeconds, formatSecondsToTime } from '../utils/tracklistParser';

export const CustomChaptersModal: React.FC = () => {
    const isCustomModalOpen = useShufflerStore((state) => state.isCustomModalOpen);
    const setCustomModalOpen = useShufflerStore((state) => state.setCustomModalOpen);
    const setMasterChapters = useShufflerStore((state) => state.setMasterChapters);
    const masterChaptersList = useShufflerStore((state) => state.masterChaptersList);

    const [activeTab, setActiveTab] = useState<'paste' | 'manual'>('paste');
    const [rawText, setRawText] = useState('');
    const [previewChapters, setPreviewChapters] = useState<Chapter[]>([]);

    // manual entry form state
    const [manualChapters, setManualChapters] = useState<Chapter[]>([]);
    const [manualTitle, setManualTitle] = useState('');
    const [manualStart, setManualStart] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // load existing chapters into manual list if available
    useEffect(() => {
        if (isCustomModalOpen && masterChaptersList.length > 0 && manualChapters.length === 0) {
            setManualChapters([...masterChaptersList]);
        }
    }, [isCustomModalOpen, masterChaptersList]);

    if (!isCustomModalOpen) return null;

    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setRawText(text);
        const parsed = parseTracklistText(text);
        setPreviewChapters(parsed);
        setErrorMessage('');
    };

    const handleUseCurrentTime = () => {
        const video = document.querySelector('video');
        if (video) {
            setManualStart(formatSecondsToTime(Math.floor(video.currentTime)));
        }
    };

    const handleAddManualChapter = () => {
        if (!manualTitle.trim()) {
            setErrorMessage('Please enter a track title');
            return;
        }
        const timeSec = parseTimeToSeconds(manualStart);
        if (timeSec === null) {
            setErrorMessage('Please enter a valid time (e.g. 0:00 or 1:23:45)');
            return;
        }

        const newChapter: Chapter = { time: timeSec, title: manualTitle.trim() };
        const updated = [...manualChapters.filter(c => c.time !== timeSec), newChapter];
        updated.sort((a, b) => a.time - b.time);
        setManualChapters(updated);
        setManualTitle('');
        setManualStart('');
        setErrorMessage('');
    };

    const handleDeleteManualChapter = (time: number) => {
        setManualChapters(manualChapters.filter(c => c.time !== time));
    };

    const handleSaveAndApply = (chaptersToApply: Chapter[]) => {
        if (chaptersToApply.length < 2) {
            setErrorMessage('Please add at least 2 chapters to create a playlist');
            return;
        }

        // ensure a 0:00 chapter exists
        if (!chaptersToApply.some(c => c.time === 0)) {
            const earliest = chaptersToApply[0];
            if (earliest.time < 10) {
                earliest.time = 0;
            } else {
                chaptersToApply.unshift({ time: 0, title: 'Intro / Track 1' });
            }
        }

        chaptersToApply.sort((a, b) => a.time - b.time);

        // persist custom chapters for this video
        if (videoId) {
            chrome.storage.local.set({ [`custom_chapters_${videoId}`]: chaptersToApply });
        }

        setMasterChapters(chaptersToApply, true);
        setCustomModalOpen(false);
    };

    const handleClearCustomChapters = () => {
        if (videoId) {
            chrome.storage.local.remove([`custom_chapters_${videoId}`]);
        }
        setMasterChapters([], false);
        setManualChapters([]);
        setCustomModalOpen(false);
    };

    const modalContent = (
        <div
            id="shuffler-custom-chapters-overlay"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)',
                fontFamily: 'Roboto, Arial, sans-serif'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) setCustomModalOpen(false);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    padding: '16px',
                    width: '460px',
                    maxWidth: '92vw',
                    maxHeight: '85vh',
                    borderRadius: '16px',
                    backgroundColor: '#0f0f0f',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.9)',
                    color: '#f1f1f1'
                }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
                onKeyPress={(e) => e.stopPropagation()}
            >
                {/* header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="18" height="18" style={{ fill: '#ff4e4e' }} viewBox="0 0 24 24">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                        <span style={{ fontWeight: 600, fontSize: '15px', color: '#ffffff' }}>Custom Chapters / Tracklist</span>
                    </div>
                    <button
                        onClick={() => setCustomModalOpen(false)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#888888',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#888888')}
                    >
                        <svg width="16" height="16" style={{ fill: 'currentColor' }} viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                </div>

                {/* tab switcher */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', borderRadius: '12px', backgroundColor: '#1c1c1c' }}>
                    <button
                        onClick={() => setActiveTab('paste')}
                        style={{
                            flex: 1,
                            padding: '6px 0',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            border: 'none',
                            transition: 'all 0.2s ease',
                            backgroundColor: activeTab === 'paste' ? '#ff4e4e' : 'transparent',
                            color: activeTab === 'paste' ? '#ffffff' : '#aaaaaa'
                        }}
                    >
                        Paste from Comments
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        style={{
                            flex: 1,
                            padding: '6px 0',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            border: 'none',
                            transition: 'all 0.2s ease',
                            backgroundColor: activeTab === 'manual' ? '#ff4e4e' : 'transparent',
                            color: activeTab === 'manual' ? '#ffffff' : '#aaaaaa'
                        }}
                    >
                        Manual Entry
                    </button>
                </div>

                {/* error message */}
                {errorMessage && (
                    <div style={{ padding: '6px 10px', borderRadius: '8px', backgroundColor: 'rgba(255, 78, 78, 0.15)', border: '1px solid rgba(255, 78, 78, 0.3)', color: '#ff6b6b', fontSize: '12px' }}>
                        {errorMessage}
                    </div>
                )}

                {/* tab 1: paste raw text */}
                {activeTab === 'paste' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <textarea
                            rows={7}
                            value={rawText}
                            onChange={handleTextChange}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder={"Paste tracklist from comments or description here...\ne.g.\nK. - 0:00 - 5:18\nEach Time You Fall In Love - 5:18 - 10:08\nSunsetz - 10:08"}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px',
                                borderRadius: '12px',
                                backgroundColor: '#191919',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#eeeeee',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                outline: 'none',
                                resize: 'none',
                                lineHeight: '1.4'
                            }}
                        />
                        {previewChapters.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto', padding: '8px', borderRadius: '12px', backgroundColor: '#141414', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                <span style={{ fontSize: '11px', fontWeight: 500, color: '#aaaaaa' }}>
                                    Detected {previewChapters.length} Tracks:
                                </span>
                                {previewChapters.map((c, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '2px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: '#dddddd' }}>{c.title}</span>
                                        <span style={{ color: '#888888', fontFamily: 'monospace', flexShrink: 0, marginLeft: '8px' }}>{formatSecondsToTime(c.time)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
                            <button
                                onClick={() => handleSaveAndApply(previewChapters)}
                                disabled={previewChapters.length < 2}
                                style={{
                                    padding: '6px 16px',
                                    borderRadius: '18px',
                                    backgroundColor: '#ff4e4e',
                                    color: '#ffffff',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: previewChapters.length < 2 ? 'not-allowed' : 'pointer',
                                    border: 'none',
                                    opacity: previewChapters.length < 2 ? 0.4 : 1,
                                    transition: 'background-color 0.2s ease'
                                }}
                            >
                                Import {previewChapters.length > 0 ? `(${previewChapters.length} Tracks)` : ''}
                            </button>
                        </div>
                    </div>
                )}

                {/* tab 2: manual chapter entry */}
                {activeTab === 'manual' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', borderRadius: '12px', backgroundColor: '#191919', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <input
                                type="text"
                                value={manualTitle}
                                onChange={(e) => setManualTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') handleAddManualChapter();
                                }}
                                placeholder="Track / Chapter title (e.g. Sunsetz)"
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    backgroundColor: '#242424',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#eeeeee',
                                    fontSize: '12px',
                                    outline: 'none'
                                }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={manualStart}
                                    onChange={(e) => setManualStart(e.target.value)}
                                    onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') handleAddManualChapter();
                                    }}
                                    placeholder="Start time (e.g. 10:08)"
                                    style={{
                                        flex: 1,
                                        boxSizing: 'border-box',
                                        padding: '8px 10px',
                                        borderRadius: '8px',
                                        backgroundColor: '#242424',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: '#eeeeee',
                                        fontSize: '12px',
                                        fontFamily: 'monospace',
                                        outline: 'none'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={handleUseCurrentTime}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        backgroundColor: '#333333',
                                        color: '#dddddd',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        border: 'none',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Current Time
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddManualChapter}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '8px',
                                        backgroundColor: '#ff4e4e',
                                        color: '#ffffff',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        border: 'none',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    + Add
                                </button>
                            </div>
                        </div>

                        {manualChapters.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '140px', overflowY: 'auto', padding: '8px', borderRadius: '12px', backgroundColor: '#141414', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                <span style={{ fontSize: '11px', fontWeight: 500, color: '#aaaaaa' }}>
                                    Added {manualChapters.length} Tracks:
                                </span>
                                {manualChapters.map((c, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: '#dddddd' }}>{c.title}</span>
                                        <span style={{ color: '#888888', fontFamily: 'monospace', flexShrink: 0, margin: '0 8px' }}>{formatSecondsToTime(c.time)}</span>
                                        <button
                                            onClick={() => handleDeleteManualChapter(c.time)}
                                            style={{
                                                color: '#888888',
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '2px',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4e4e')}
                                            onMouseLeave={(e) => (e.currentTarget.style.color = '#888888')}
                                        >
                                            <svg width="14" height="14" style={{ fill: 'currentColor' }} viewBox="0 0 24 24">
                                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                            {masterChaptersList.length > 0 ? (
                                <button
                                    onClick={handleClearCustomChapters}
                                    style={{
                                        fontSize: '12px',
                                        color: '#888888',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ff4e4e')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = '#888888')}
                                >
                                    Clear Custom Chapters
                                </button>
                            ) : <div />}
                            <button
                                onClick={() => handleSaveAndApply(manualChapters)}
                                disabled={manualChapters.length < 2}
                                style={{
                                    padding: '6px 16px',
                                    borderRadius: '18px',
                                    backgroundColor: '#ff4e4e',
                                    color: '#ffffff',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: manualChapters.length < 2 ? 'not-allowed' : 'pointer',
                                    border: 'none',
                                    opacity: manualChapters.length < 2 ? 0.4 : 1,
                                    transition: 'background-color 0.2s ease'
                                }}
                            >
                                Save & Apply
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
