import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../style.css';
import { SavedPreset, Chapter } from './shufflerStore';

function PopupApp() {
    const [isAudioFadeEnabled, setIsAudioFadeEnabled] = useState(false);
    const [isAutoShuffleEnabled, setIsAutoShuffleEnabled] = useState(false);
    const [isKeepPlaylistOnRefreshEnabled, setIsKeepPlaylistOnRefreshEnabled] = useState(true);
    const [fadeDuration, setFadeDuration] = useState(1);
    const [videoId, setVideoId] = useState<string | null>(null);
    const [presets, setPresets] = useState<SavedPreset[]>([]);
    const [currentQueue, setCurrentQueue] = useState<Chapter[]>([]);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editingName, setEditingName] = useState('');

    useEffect(() => {
        // load global settings
        chrome.storage.local.get(['isAudioFadeEnabled', 'fadeDuration', 'isAutoShuffleEnabled', 'isKeepPlaylistOnRefreshEnabled'], (result) => {
            if (result.isAudioFadeEnabled !== undefined) {
                setIsAudioFadeEnabled(result.isAudioFadeEnabled as boolean);
            }
            if (result.fadeDuration !== undefined) {
                setFadeDuration(result.fadeDuration as number);
            }

            if (result.isAutoShuffleEnabled !== undefined) {
                setIsAutoShuffleEnabled(result.isAutoShuffleEnabled as boolean);
            }

            if (result.isKeepPlaylistOnRefreshEnabled !== undefined) {
                setIsKeepPlaylistOnRefreshEnabled(result.isKeepPlaylistOnRefreshEnabled as boolean);
            }
        });

        // get the current youtube tab's video id and shuffled queue via messaging
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab?.id || !tab.url?.includes('youtube.com/watch')) return;

            const url = new URL(tab.url);
            const vid = url.searchParams.get('v');
            if (!vid) return;
            setVideoId(vid);

            // load presets for this video
            chrome.storage.local.get([`presets_${vid}`], (result) => {
                const saved = (result[`presets_${vid}`] as SavedPreset[]) ?? [];
                setPresets(saved);
            });

            // ask the content script for the current shuffled queue
            chrome.tabs.sendMessage(tab.id!, { action: 'GET_CURRENT_QUEUE' }, (response) => {
                if (chrome.runtime.lastError || !response?.queue) return;
                setCurrentQueue(response.queue as Chapter[]);
            });
        });
    }, []);

    function saveCurrentQueue() {
        if (!videoId || currentQueue.length === 0) return;
        const nextNumber = presets.length + 1;
        const defaultName = `Shuffle Queue #${nextNumber}`;
        const newPreset: SavedPreset = { name: defaultName, queue: currentQueue };
        const updated = [...presets, newPreset];
        setPresets(updated);
        chrome.storage.local.set({ [`presets_${videoId}`]: updated });

        // immediately enter edit mode and highlight the name
        setEditingIdx(presets.length);
        setEditingName(defaultName);
    }

    function deletePreset(idx: number) {
        const updated = presets.filter((_, i) => i !== idx);
        setPresets(updated);
        if (videoId) chrome.storage.local.set({ [`presets_${videoId}`]: updated });
    }

    function savePresetName(idx: number) {
        const trimmed = editingName.trim();
        if (!trimmed) return;
        const updated = presets.map((p, i) => i === idx ? { ...p, name: trimmed } : p);
        setPresets(updated);
        if (videoId) chrome.storage.local.set({ [`presets_${videoId}`]: updated });
        setEditingIdx(null);
    }

    return (
        <div className="w-[320px] p-4 flex flex-col gap-4 bg-[#0f0f0f]">
            {/* header */}
            <div className="flex items-center gap-2 pb-3 border-b border-[#3f3f3f]">
                <div className="w-8 h-8 rounded bg-[#ff4e4e] flex items-center justify-center font-bold text-white">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M10.59,9.17L5.41,4L4,5.41l5.17,5.17C9.17,10.59,10.59,9.17,10.59,9.17z M14.5,4l2.04,2.04L4,18.59L5.41,20l12.55-12.55 L20,9.5V4H14.5z M14.83,13.41l-1.41,1.41l3.13,3.13L14.5,20H20v-5.5l-2.04,2.04L14.83,13.41z" />
                    </svg>
                </div>
                <div className="flex flex-col">
                    <h1 className="text-base font-bold text-white leading-tight">YT Chapter Shuffler</h1>
                    <span className="text-xs text-[#aaaaaa]">Global Settings</span>
                </div>
            </div>

            {/* audio fading */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">Smooth Audio Fading</span>
                        <span className="text-xs text-[#aaaaaa]">Fades volume out before jumping tracks</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isAudioFadeEnabled}
                            onChange={(e) => {
                                const val = e.target.checked;
                                setIsAudioFadeEnabled(val);
                                chrome.storage.local.set({ isAudioFadeEnabled: val });
                            }}
                        />
                        <div className="w-9 h-5 bg-[#3f3f3f] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ff4e4e]"></div>
                    </label>
                </div>

                {isAudioFadeEnabled && (
                    <div className="flex flex-col gap-1.5 pt-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-[#aaaaaa]">Fade Duration</span>
                            <span className="text-xs font-medium text-white">{fadeDuration}s</span>
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="5"
                            step="0.5"
                            value={fadeDuration}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setFadeDuration(val);
                                chrome.storage.local.set({ fadeDuration: val });
                            }}
                            className="w-full h-1 bg-[#3f3f3f] rounded-lg appearance-none cursor-pointer accent-[#ff4e4e]"
                        />
                        <div className="flex justify-between text-[10px] text-[#666666]">
                            <span>0.5s</span>
                            <span>5s</span>
                        </div>
                    </div>
                )}
            </div>

            {/* auto shuffle toggle */}
            <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">Smart Auto-Shuffle</span>
                        <span className="text-xs text-[#aaaaaa]">Auto-shuffles music videos on load</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isAutoShuffleEnabled}
                            onChange={(e) => {
                                const val = e.target.checked;
                                setIsAutoShuffleEnabled(val);
                                chrome.storage.local.set({ isAutoShuffleEnabled: val });
                            }}
                        />
                        <div className="w-9 h-5 bg-[#3f3f3f] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ff4e4e]"></div>
                    </label>
                </div>

                {isAutoShuffleEnabled && (
                    <div className="flex items-center justify-between pl-3 pr-1 py-1.5 rounded-lg bg-[#252525] border border-[#333333]">
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-[#e0e0e0]">Keep Playlist on Refresh</span>
                            <span className="text-[10px] text-[#888888]">Don't reshuffle if refreshing current video</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isKeepPlaylistOnRefreshEnabled}
                                onChange={(e) => {
                                    const val = e.target.checked;
                                    setIsKeepPlaylistOnRefreshEnabled(val);
                                    chrome.storage.local.set({ isKeepPlaylistOnRefreshEnabled: val });
                                }}
                            />
                            <div className="w-7 h-4 bg-[#3f3f3f] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#ff4e4e]"></div>
                        </label>
                    </div>
                )}
            </div>

            {/* custom chapters section */}
            {videoId && (
                <div className="flex items-center justify-between pt-3 border-t border-[#3f3f3f]">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">Custom Chapters</span>
                        <span className="text-xs text-[#aaaaaa]">Paste from comments or add manually</span>
                    </div>
                    <button
                        className="text-[11px] px-3 py-1 rounded-full bg-[#2a2a2a] hover:bg-[#383838] text-white font-medium cursor-pointer border border-[rgba(255,255,255,0.1)] transition-colors"
                        onClick={() => {
                            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                                if (tabs[0]?.id) {
                                    chrome.tabs.sendMessage(tabs[0].id, { action: 'OPEN_CUSTOM_CHAPTERS' });
                                    window.close();
                                }
                            });
                        }}
                    >
                        Manage
                    </button>
                </div>
            )}

            {/* save playlist — only shows when on a youtube video tab */}
            {videoId && (
                <div className="flex flex-col gap-2 pt-3 border-t border-[#3f3f3f]">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-white">Save Playlist</span>
                            <span className="text-xs text-[#aaaaaa]">Save the current shuffle order for this video</span>
                        </div>
                        <button
                            className="text-[11px] px-3 py-1 rounded-full bg-[#ff4e4e] text-white font-medium cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
                            onClick={saveCurrentQueue}
                            disabled={currentQueue.length === 0}
                            title={currentQueue.length === 0 ? 'Start a shuffle first' : 'Save current shuffle order'}
                        >
                            Save
                        </button>
                    </div>

                    {/* list of saved presets */}
                    {presets.length > 0 && (
                        <div className="flex flex-col gap-1 mt-1">
                            {presets.map((preset, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2f2f2f]">
                                    {editingIdx === idx ? (
                                        <input
                                            className="flex-1 text-xs bg-transparent text-white border-b border-[#ff4e4e] outline-none"
                                            value={editingName}
                                            autoFocus
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            onBlur={() => savePresetName(idx)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') savePresetName(idx); if (e.key === 'Escape') setEditingIdx(null); }}
                                        />
                                    ) : (
                                        <span
                                            className="flex-1 text-xs text-[#f1f1f1] truncate cursor-pointer"
                                            title="Click to rename"
                                            onClick={() => { setEditingIdx(idx); setEditingName(preset.name); }}
                                        >
                                            {preset.name}
                                        </span>
                                    )}
                                    <button
                                        className="text-[10px] text-[#aaaaaa] hover:text-[#ff4e4e] bg-transparent border-none cursor-pointer p-0 leading-none"
                                        onClick={() => deletePreset(idx)}
                                        title="Delete preset"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {presets.length === 0 && currentQueue.length === 0 && (
                        <p className="text-[11px] text-[#555555]">Open a YouTube video with chapters and shuffle it first.</p>
                    )}
                </div>
            )}
        </div>
    );
}

const rootElement = document.getElementById('popup-root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<PopupApp />);
}
