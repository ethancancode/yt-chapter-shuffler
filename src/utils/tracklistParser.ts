import { Chapter } from '../shufflerStore';

// parse a time string like "01:23" or "1:02:45" to total seconds
export function parseTimeToSeconds(timeStr: string): number | null {
    const cleaned = timeStr.trim();
    const parts = cleaned.split(':').map(p => parseInt(p, 10));
    if (parts.some(isNaN)) return null;

    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
}

// format total seconds into a clean "MM:SS" or "H:MM:SS" string
export function formatSecondsToTime(seconds: number): string {
    const totalMinutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${totalMinutes}:${secs.toString().padStart(2, '0')}`;
}

// robust parser for pasting tracklists from youtube comments or descriptions
export function parseTracklistText(rawText: string): Chapter[] {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const scrapedChapters: Chapter[] = [];
    const seenTimes = new Set<number>();

    // regex for matching timestamp patterns like 0:00, 00:00, 1:23:45
    const timestampRegex = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const matches = [...line.matchAll(timestampRegex)];
        if (!matches || matches.length === 0) continue;

        // the first timestamp found on the line is treated as start time
        const firstMatch = matches[0];
        const timeInSeconds = parseTimeToSeconds(firstMatch[1]);
        if (timeInSeconds === null) continue;

        // clean track title by removing all timestamp tokens and unwanted prefixes/suffixes
        let title = line
            .replace(timestampRegex, '')
            .replace(/^\[.*?\]/, '') // remove brackets if wrapped around numbers
            .replace(/^\d+[\s\-.)]+/, '') // remove track numbering like "1. ", "02 - "
            .replace(/^[\s\-:|>=~.]+/, '')
            .replace(/[\s\-:|>=~.]+$/, '')
            .trim();

        if (!title) {
            title = `Track ${scrapedChapters.length + 1}`;
        }

        if (!seenTimes.has(timeInSeconds)) {
            seenTimes.add(timeInSeconds);
            scrapedChapters.push({ time: timeInSeconds, title });
        }
    }

    scrapedChapters.sort((a, b) => a.time - b.time);
    return scrapedChapters;
}
