// @ts-nocheck
"use client";
import Heading from "./heading";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Edges, Center } from "@react-three/drei";
import { STLLoader, GLTFLoader } from "three-stdlib";
import { useRef, useState, useEffect, useMemo, Suspense } from "react";
import { hslToHex } from "@/lib/utils";
import {Html, useProgress} from "@react-three/drei";
import * as THREE from "three";

function RotatingSTL({
    url,
    focus,
    scale = 3,
}: {
    url: string;
    focus: boolean;
    scale?: number;
}) {
    // Loads the STL file into a Three.js BufferGeometry
    const rawGeometry = useLoader(STLLoader, url);
    const meshRef = useRef();

    // 1. Track whether the mouse is actively over the model
    const [isHovered, setIsHovered] = useState(false);

    // 2. We need a ref to keep track of the continuous Z-rotation
    // so it doesn't reset to zero every time we move the mouse
    const spinZ = useRef(0);

    // State to hold our hex colors
    const [colors, setColors] = useState({
        secondary: "#000000",
        primary: "#ffffff",
    });

    const geometry = useMemo(() => {
        // This calculates the bounding box and physically shifts all vertices
        rawGeometry.center();
        return rawGeometry;
    }, [rawGeometry]);

    useEffect(() => {
        // Read the CSS variables from the browser document when the component mounts
        const rootStyles = getComputedStyle(document.documentElement);

        const rawSecondary = rootStyles.getPropertyValue("--secondary").trim();
        const rawPrimary = rootStyles.getPropertyValue("--primary").trim();
        console.log(rawSecondary);
        setColors({
            secondary: hslToHex(rawSecondary) || "#ff0000",
            primary: hslToHex(rawPrimary) || "#ffffff",
        });
    }, []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        const currentRot = meshRef.current.rotation;
        const currentPos = meshRef.current.position;

        // Variables to hold where the book SHOULD be aiming this frame
        let targetX, targetY, targetZ, targetPosY;

        if (focus) {
            const mouseX = state.pointer.x;
            const mouseY = state.pointer.y;

            targetX = -Math.PI / 2 + mouseY * 0.5;
            targetY = 0; // Lock Z to 0 so the book straightens out to be read
            targetZ = mouseX * 0.5;
            targetPosY = mouseY * 0.5;

            spinZ.current = currentRot.z;
        } else {
            spinZ.current += delta * 1.5; // Keep the engine running

            targetX = -Math.PI / 2; // Flat on its back
            targetY = 0;
            targetZ = spinZ.current; // Apply the continuous spin
            targetPosY = Math.sin(spinZ.current * 0.8) * 3.5; // Apply the bobbing
        }

        const lerpSpeed = 0.1; // Lower = heavier/smoother. Higher = snappier.
        
        currentRot.x = THREE.MathUtils.lerp(currentRot.x, targetX, lerpSpeed);
        currentRot.y = THREE.MathUtils.lerp(currentRot.y, targetY, lerpSpeed);
        currentRot.z = THREE.MathUtils.lerp(currentRot.z, targetZ, lerpSpeed);
        currentPos.y = THREE.MathUtils.lerp(
            currentPos.y,
            targetPosY,
            lerpSpeed,
        );
    });

    return (
        // STLs usually have terrible default origins. <Center> fixes this automatically!
        <Center>
            <mesh ref={meshRef} geometry={geometry} scale={scale}>
                <meshBasicMaterial
                    visible={true}
                    color={colors.secondary}
                    toneMapped={false}
                />
                <Edges threshold={35} color={colors.primary} />
            </mesh>
        </Center>
    );
}

const Loader = () => {
    const {progress} = useProgress()

    return (
        <Html center>
            <span style={{color: "white"}}>
                {Math.floor(progress)} % loaded
            </span>
        </Html>
    );
};

export default function HeavenlyMesh({
    meshPath,
    focus,
    scale,
}: {
    meshPath: string;
    focus: boolean;
    scale?: number;
}) {
    return (
        <Canvas camera={{ position: [0, 30, 100], fov: 50 }}>
            {/* Suspense is REQUIRED when using useLoader.
              It catches the rendering pause while the .stl downloads.
            */}
            <Suspense fallback={<Loader />}>
                {/* Replace with the actual path to your STL in the /public folder */}
                <RotatingSTL url={meshPath} focus={focus} scale={scale} />
            </Suspense>
        </Canvas>
    );
}
