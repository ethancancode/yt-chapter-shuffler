# YouTube Chapter Shuffler

A Chrome Extension built with React, Vite, Tailwind CSS v4, and Zustand that allows you to shuffle, reorder, loop, and exclude video chapters directly on YouTube.

## Features
- **Random Shuffling**: Shuffles the timeline tracks/chapters dynamically.
- **Manual Reordering**: Drag-and-drop tracks to custom-arrange your queue.
- **Dynamic Loops**: Choose to repeat a single chapter, repeat the whole playlist, or reshuffle automatically when the playlist ends.
- **Chapter Exclusion**: Toggle specific chapters off/on to skip tracks you don't want to hear.
- **Sleek UI**: Modern, glassmorphism-styled floating window with smooth micro-interactions that feels native to YouTube.

## Project Structure
```text
yt-chapter-shuffler/
├── src/                 # Extension Source Code
│   ├── background.ts    # Extension background service worker
│   ├── content.tsx      # Core content script (injects React UI into YouTube DOM)
│   ├── shufflerStore.ts # Zustand state management store
│   └── components/      # UI components
│       ├── QueueWindow.tsx   # Floating chapter playlist queue window
│       ├── ShufflerPills.tsx  # Interactive Pill triggers next to YT controls
│       └── TrackItem.tsx     # Draggable list item component
├── manifest.json        # Extension Manifest V3 configuration
├── style.css            # Global Tailwind CSS entrypoint
├── vite.config.js       # Vite configuration using CRXJS
├── package.json         # Project dependencies & scripts
└── .gitignore           # Ignored files (node_modules, dist)
```

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### Installation & Development

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/yt-chapter-shuffler.git
   cd yt-chapter-shuffler
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run the Live Development Server**:
   ```bash
   npm run dev
   ```
   This will start a watcher and compile the code into a `dist/` directory.

4. **Load the Extension in Google Chrome**:
   * Navigate to `chrome://extensions/` in Chrome.
   * Turn on **Developer mode** (top-right toggle switch).
   * Click **Load unpacked** (top-left button).
   * Select the `dist` folder generated inside the project root directory.
   * Open any YouTube video with chapters/timestamps to see it in action!

### Production Build
To create an optimized production build of the extension:
```bash
npm run build
```
You can then zip the resulting `dist` folder and distribute the extension.

## Roadmap & Upcoming Features
Here are the features planned for future updates:
1. **Save Custom Shuffled Queues (Presets)**: Save your custom shuffled sequence to local Chrome storage keyed by YouTube Video ID, allowing you to restore your perfect shuffle layout instantly.
2. **Manual / Custom Split Mode**: Input custom timestamps or split any video into equal intervals (e.g. 5-minute segments) to shuffle videos even if they do not have description chapters.
3. **Keyboard Shortcuts**: Map hotkeys (like `Alt+S` to shuffle, `Alt+L` to toggle loop, `Alt+N` to skip) for hands-free control in full-screen mode.
4. **Smooth Fade-Out / Audio Transition**: Automatically fade down the player volume over the last 0.5s of a track before skipping to the next one to eliminate jarring volume cuts.
5. **...and more(?)**


