import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hslToHex(hslString: string) {
    if (!hslString) return null;

    // 1. Clean the string and extract the H, S, and L values
    // Handles formats like "222.2 47.4% 11.2%" or "222, 47%, 11%"
    const parts = hslString.replace(/%/g, '').split(/[\s,]+/).filter(Boolean).map(Number);
    if (parts.length < 3) return hslString; // Fallback in case it's already a hex

    const [h, sRaw, lRaw] = parts;
    const s = sRaw / 100;
    const l = lRaw / 100;

    // 2. Convert HSL to RGB
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    // 3. Convert RGB to Hex
    const toHex = (colorVal: number) => {
        const hex = Math.round((colorVal + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}