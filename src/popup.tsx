import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../style.css';

function PopupApp() {
    const [isAudioFadeEnabled, setIsAudioFadeEnabled] = useState(false);
    const [fadeDuration, setFadeDuration] = useState(1);

    useEffect(() => {
        chrome.storage.local.get(['isAudioFadeEnabled', 'fadeDuration'], (result) => {
            if (result.isAudioFadeEnabled !== undefined) {
                setIsAudioFadeEnabled(result.isAudioFadeEnabled as boolean);
            }
            if (result.fadeDuration !== undefined) {
                setFadeDuration(result.fadeDuration as number);
            }
        });
    }, []);

    return (
        <div className="w-[320px] p-4 flex flex-col gap-4 bg-[#0f0f0f]">
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
        </div>
    );
};

const rootElement = document.getElementById('popup-root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<PopupApp />);
}
