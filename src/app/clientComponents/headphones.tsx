"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { hslToHex } from "@/lib/utils";
import * as THREE from "three";

function HeadphoneModel({ reduced, active, colors }: { reduced: boolean; active: boolean; colors: { ink: string; surface: string } }) {
    const group = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const spin = useRef(0.45);
    const viewport = useThree((state) => state.viewport);
    // Fit the entire rotation envelope, including the outer earcups, on narrow canvases.
    const scale = Math.min(1, viewport.width / 3.8, viewport.height / 3.8);
    useFrame((state, delta) => {
        if (!group.current || reduced || !active) return;
        spin.current += Math.min(delta, 0.05) * 0.28;
        const ease = 1 - Math.exp(-4 * delta);
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, hovered ? state.pointer.x * 0.6 : spin.current, ease);
        group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, hovered ? -state.pointer.y * 0.2 : 0.12, ease);
        group.current.position.y = Math.sin(spin.current * 1.8) * 0.09;
    });
    const material = <meshBasicMaterial color={colors.surface} toneMapped={false} />;
    const edges = <Edges threshold={18} color={colors.ink} />;
    return (
        <group ref={group} scale={scale} rotation={[0.12, 0.45, -0.08]} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
            {/* Open semicircular headband, with a separate padded inner band. */}
            <mesh position={[0, 0.25, 0]}>
                <torusGeometry args={[1.24, 0.115, 6, 32, Math.PI]} />
                {material}{edges}
            </mesh>
            <mesh position={[0, 0.25, 0]}>
                <torusGeometry args={[1.08, 0.09, 6, 28, Math.PI]} />
                {material}{edges}
            </mesh>
            {[-1, 1].map((side) => (
                <group key={side} position={[side * 1.18, -0.33, 0]}>
                    <mesh position={[0, 0.33, 0]}>
                        <boxGeometry args={[0.12, 0.8, 0.2]} />
                        {material}{edges}
                    </mesh>
                    <group rotation={[0, 0, side * -0.12]}>
                        <mesh rotation={[0, 0, Math.PI / 2]} scale={[1, 1.28, 1]}>
                            <cylinderGeometry args={[0.49, 0.49, 0.28, 24]} />
                            {material}{edges}
                        </mesh>
                        <mesh position={[side * -0.18, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1.28, 1]}>
                            <torusGeometry args={[0.35, 0.13, 8, 24]} />
                            {material}{edges}
                        </mesh>
                        <mesh position={[side * 0.17, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1.28, 1]}>
                            <cylinderGeometry args={[0.36, 0.36, 0.07, 24]} />
                            {material}{edges}
                        </mesh>
                        {[-0.15, 0, 0.15].map((offset) => (
                            <mesh key={offset} position={[side * 0.21, offset, 0]}>
                                <boxGeometry args={[0.01, 0.025, 0.36]} />
                                <meshBasicMaterial color={colors.ink} toneMapped={false} />
                            </mesh>
                        ))}
                    </group>
                </group>
            ))}
        </group>
    );
}

export default function Headphones() {
    const host = useRef<HTMLDivElement>(null);
    const { resolvedTheme } = useTheme();
    const [reduced, setReduced] = useState(true);
    const [active, setActive] = useState(false);
    const [supported, setSupported] = useState(true);
    const [colors, setColors] = useState({ ink: "#171717", surface: "#f5f5f5" });

    useEffect(() => {
        const css = getComputedStyle(document.documentElement);
        setColors({ ink: hslToHex(css.getPropertyValue("--primary").trim()) ?? "#171717", surface: hslToHex(css.getPropertyValue("--secondary").trim()) ?? "#f5f5f5" });
    }, [resolvedTheme]);
    useEffect(() => {
        const media = matchMedia("(prefers-reduced-motion: reduce)");
        const update = () => setReduced(media.matches);
        update();
        media.addEventListener("change", update);
        const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
        if (host.current) observer.observe(host.current);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("webgl2");
        setSupported(Boolean(context));
        context?.getExtension("WEBGL_lose_context")?.loseContext();
        return () => { media.removeEventListener("change", update); observer.disconnect(); };
    }, []);

    return (
        <div ref={host} className="h-full w-full" aria-hidden="true">
            {supported ? <Canvas dpr={[1, 1.5]} frameloop={reduced || !active ? "demand" : "always"} camera={{ position: [0, 0.3, 5.6], fov: 44 }}>
                <HeadphoneModel reduced={reduced} active={active} colors={colors} />
            </Canvas> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Headphones / 3D unavailable</div>}
        </div>
    );
}
