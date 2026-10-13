"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Mesh } from "three";
import useGraphicVisibility from "./useGraphicVisibility";

const vertexShader = `varying vec4 _pos; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); _pos = gl_Position; }`;
const fragmentShader = `varying vec4 _pos; void main() { float f = fract(_pos.z * 25.0); float df = fwidth(_pos.z * 10.0); float g = smoothstep(df, df * 3.0, f); gl_FragColor = vec4(vec3((1.0 - g) * 0.5), 1.0 - g); }`;

function Model({ active }: { active: boolean }) {
    const gltf = useGLTF("/a7.glb");
    const mesh = useRef<Mesh>(null);
    useFrame((_, delta) => { if (mesh.current && active) mesh.current.rotation.z += Math.min(delta, 0.05) * 0.15; });
    const geometry = (gltf.nodes.model_2 as Mesh | undefined)?.geometry;
    return geometry ? <mesh ref={mesh} geometry={geometry} rotation={[Math.PI / 2, 0, 0]} scale={0.002} position={[0, -2, 0]}><shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} /></mesh> : null;
}

export default function PhotoCameraScene() {
    const { ref, active } = useGraphicVisibility('0px');
    return <div ref={ref} className="h-full w-full"><Canvas dpr={[1, 1.5]} frameloop={active ? "always" : "demand"}><Suspense fallback={null}><Model active={active} /></Suspense></Canvas></div>;
}
