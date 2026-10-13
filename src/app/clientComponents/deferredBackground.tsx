"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Background = dynamic(() => import("./background"), { ssr: false });

export default function DeferredBackground() {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        // Paint the identity and links before loading the decorative WebGL bundle.
        const frame = requestAnimationFrame(() => { timer = setTimeout(() => setReady(true), 0); });
        let timer: ReturnType<typeof setTimeout>;
        return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
    }, []);
    return ready ? <Background /> : <div className="absolute inset-0 bg-secondary" aria-hidden="true" />;
}
