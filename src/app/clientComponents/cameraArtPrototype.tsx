"use client";

// PROTOTYPE: compare annotated traces, original drawings, and source renderings
// on the Photos section via ?camera-art=annotated|original|filtered|detail|model.
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CameraViews from "./cameraViews";
import ModelCameraViews from "./modelCameraViews";
import styles from "../../../styles/CameraArtPrototype.module.css";

const variants = [
    { key: "annotated", label: "Annotated model", detail: "12° traced geometry unchanged · vector Sony and control markings" },
    { key: "original", label: "Original SVGs", detail: "Hand-authored geometry and vector lettering" },
    { key: "filtered", label: "Filtered trace", detail: "a7.glb · smoothed render → Canny edges → simplified SVG paths" },
    { key: "detail", label: "Unlettered 12°", detail: "Checkpoint c5c0a75 · original 12° hidden-line geometry" },
    { key: "model", label: "Source model", detail: "a7.glb · orthographic solid render · 427,812 triangles" },
] as const;

export default function CameraArtPrototype() {
    const [enabled, setEnabled] = useState(false);
    const [index, setIndex] = useState(0);
    const current = variants[index];
    const select = useCallback((next: number) => {
        const value = (next + variants.length) % variants.length;
        const url = new URL(window.location.href);
        url.searchParams.set("camera-art", variants[value].key);
        window.history.replaceState(null, "", url);
        setIndex(value);
    }, []);

    useEffect(() => {
        const sync = () => {
            const key = new URLSearchParams(window.location.search).get("camera-art");
            setEnabled(key !== null);
            setIndex(Math.max(0, variants.findIndex((variant) => variant.key === key)));
        };
        sync();
        window.addEventListener("popstate", sync);
        return () => window.removeEventListener("popstate", sync);
    }, []);

    useEffect(() => {
        if (!enabled) return;
        const keydown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (target.closest("input, textarea, select, [contenteditable='true']") || document.querySelector('[role="dialog"]')) return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                select(index + (event.key === "ArrowRight" ? 1 : -1));
            }
        };
        window.addEventListener("keydown", keydown);
        return () => window.removeEventListener("keydown", keydown);
    }, [enabled, index, select]);

    return <>
        {current.key === "original" ? <CameraViews /> : <ModelCameraViews variant={current.key} />}
        {enabled && <aside className={styles.controls} aria-label="Camera illustration prototype">
            <button onClick={() => select(index - 1)} aria-label="Previous illustration variant"><ChevronLeft size={18} /></button>
            <div className={styles.state} role="status"><strong>{index + 1}/{variants.length} · {current.label}</strong><span>{current.detail}</span></div>
            <button onClick={() => select(index + 1)} aria-label="Next illustration variant"><ChevronRight size={18} /></button>
            <button onClick={() => { const url = new URL(window.location.href); url.searchParams.delete("camera-art"); window.history.replaceState(null, "", url); setIndex(0); setEnabled(false); }} className={styles.exit}>Exit preview</button>
        </aside>}
    </>;
}
