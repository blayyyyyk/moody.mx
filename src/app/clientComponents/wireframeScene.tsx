"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Group, MathUtils, Sphere, Vector3 } from "three";
import { useTheme } from "next-themes";
import { hslToHex } from "@/lib/utils";
import { decodeWireModel } from "@/lib/wire-model";

type Model = ReturnType<typeof decodeWireModel>;

function WireObject({ model, colors, focus, scale, active }: { model: Model; colors: { ink: string; surface: string }; focus: boolean; scale: number; active: boolean }) {
    const group = useRef<Group>(null);
    const spin = useRef(0);
    const [solid, outline] = useMemo(() => {
        const solid = new BufferGeometry();
        solid.setAttribute("position", new BufferAttribute(model.positions, 3, true));
        solid.setIndex(new BufferAttribute(model.indices, 1));
        solid.boundingSphere = new Sphere(new Vector3(), Math.sqrt(3));
        const outline = new BufferGeometry();
        outline.setAttribute("position", new BufferAttribute(model.edges, 3, true));
        outline.boundingSphere = solid.boundingSphere.clone();
        return [solid, outline];
    }, [model]);
    useEffect(() => () => { solid.dispose(); outline.dispose(); }, [solid, outline]);
    useFrame((state, elapsed) => {
        if (!group.current || !active) return;
        const delta = Math.min(elapsed, 0.05);
        const rotation = group.current.rotation;
        const smoothing = 1 - Math.exp(-6 * delta);
        if (focus) spin.current = rotation.z;
        else spin.current += delta * 1.5;
        rotation.x = MathUtils.lerp(rotation.x, -Math.PI / 2 + (focus ? state.pointer.y * 0.5 : 0), smoothing);
        rotation.z = MathUtils.lerp(rotation.z, focus ? state.pointer.x * 0.5 : spin.current, smoothing);
        group.current.position.y = MathUtils.lerp(group.current.position.y, focus ? state.pointer.y * 0.5 : Math.sin(spin.current * 0.8) * 3.5, smoothing);
    });
    return <group ref={group} rotation={[-Math.PI / 2, 0, 0]}>
        <group scale={scale * model.extent}>
            <mesh geometry={solid}><meshBasicMaterial color={colors.surface} toneMapped={false} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} /></mesh>
            <lineSegments geometry={outline}><lineBasicMaterial color={colors.ink} toneMapped={false} /></lineSegments>
        </group>
    </group>;
}

export default function WireframeScene({ source, focus, scale, active }: { source: string; focus: boolean; scale: number; active: boolean }) {
    const [model, setModel] = useState<Model | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const { resolvedTheme } = useTheme();
    const [colors, setColors] = useState({ ink: "#171717", surface: "#f5f5f5" });
    useEffect(() => {
        const styles = getComputedStyle(document.documentElement);
        setColors({ ink: hslToHex(styles.getPropertyValue("--primary")) ?? "#171717", surface: hslToHex(styles.getPropertyValue("--secondary")) ?? "#f5f5f5" });
    }, [resolvedTheme]);
    useEffect(() => {
        const controller = new AbortController();
        setModel(null); setFailed(false);
        fetch(source, { signal: controller.signal }).then(async (response) => {
            if (!response.ok) throw new Error("Model unavailable");
            return decodeWireModel(await response.arrayBuffer());
        }).then((model) => { if (!controller.signal.aborted) setModel(model); }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
        return () => controller.abort();
    }, [source, attempt]);
    if (failed) return <div className="flex h-full items-center justify-center"><button className="border border-primary p-3 text-xs" onClick={() => setAttempt((n) => n + 1)}>Retry 3D model</button></div>;
    if (!model) return <div className="flex h-full items-center justify-center text-xs text-muted-foreground" role="status">Loading model…</div>;
    return <div className="h-full w-full" data-model-ready="true" aria-hidden="true">
        <Canvas camera={{ position: [0, 30, 100], fov: 50 }} dpr={[1, 1.5]} frameloop={active ? "always" : "demand"} gl={{ antialias: true, powerPreference: "low-power" }}>
            <WireObject model={model} colors={colors} focus={focus} scale={scale} active={active} />
        </Canvas>
    </div>;
}
