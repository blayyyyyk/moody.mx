"use client";

import dynamic from "next/dynamic";
import useGraphicVisibility from "./useGraphicVisibility";

const WireframeScene = dynamic(() => import("./wireframeScene"), { ssr: false });

export type WireModelName = "simplify_Enchiridion_" | "RTX_3080_FE";

export default function HeavenlyMesh({ model, focus, scale = 3 }: { model: WireModelName; focus: boolean; scale?: number }) {
    const { ref, near, active, reduced } = useGraphicVisibility();
    return <div ref={ref} className="h-full w-full" data-model={model} data-animated={active}>
        {near && <WireframeScene source={`/models/${model}.wire.bin`} focus={focus && !reduced} scale={scale} active={active} />}
    </div>;
}
