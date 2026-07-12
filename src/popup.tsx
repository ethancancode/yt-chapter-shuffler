import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../style.css';

function PopupApp() {
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

            <div className="flex flex-col gap-2">
                <p className="text-sm text-[#aaaaaa]">
                    Settings
                </p>
            </div>
        </div>
    );
};

const rootElement = document.getElementById('popup-root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<PopupApp />);
}
