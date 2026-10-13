"use client";

import { useEffect, useRef, useState } from "react";

export default function useGraphicVisibility(margin = "300px") {
    const ref = useRef<HTMLDivElement>(null);
    const [near, setNear] = useState(false);
    const [visible, setVisible] = useState(false);
    const [pageVisible, setPageVisible] = useState(true);
    const [reduced, setReduced] = useState(true);
    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const preload = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { setNear(true); preload.disconnect(); }
        }, { rootMargin: margin });
        const viewport = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
        const preference = matchMedia("(prefers-reduced-motion: reduce)");
        const updateMotion = () => setReduced(preference.matches);
        const updateVisibility = () => setPageVisible(!document.hidden);
        updateMotion(); updateVisibility();
        preload.observe(node); viewport.observe(node);
        preference.addEventListener("change", updateMotion);
        document.addEventListener("visibilitychange", updateVisibility);
        return () => {
            preload.disconnect(); viewport.disconnect();
            preference.removeEventListener("change", updateMotion);
            document.removeEventListener("visibilitychange", updateVisibility);
        };
    }, [margin]);
    return { ref, near, visible: visible && pageVisible, active: visible && pageVisible && !reduced, reduced };
}
