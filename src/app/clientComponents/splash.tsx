"use client"
import styles from '../styles/Home.module.css'
import Background from './background';
import Heading from './heading';

import PROFILE_BG from '../public/profile-cropped.jpg';
import "../../../styles/globals.css";

import Banner from './banner';
import Links from './links';

import { useRef, useEffect } from "react";
import * as THREE from 'three'
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, shaderMaterial } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ColorShiftMaterial = shaderMaterial(
    { time: 0, color: new THREE.Color(0.2, 0.0, 0.1) },
    // vertex shader
    /*glsl*/`
      varying vec2 vUv;
      varying vec4 _pos;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        _pos = gl_Position;
      }
    `,
    // fragment shader
    /*glsl*/`
      uniform float time;

      varying vec2 vUv;

      varying vec4 _pos;

      void main() {
        float f  = fract (_pos.z * 25.0);
        float df = fwidth(_pos.z * 10.0);

        float g = smoothstep(df * 1.0, df * 3.0, f);

        float c = g;

        gl_FragColor = vec4((1.0 - c) * 0.5, (1.0 - c) * 0.5, (1.0 - c) * 0.5, (1.0 - c));
      }
    `
)

// declaratively
extend({ ColorShiftMaterial })

const Model = ({ path, position, scale }: { path: string, position: [number, number, number], scale: number }) => {
    const gltf = useGLTF(path);
    const matRef = useRef<THREE.Mesh>(null!);

    const speed = Math.random()

    useFrame(({ clock }) =>{
        if(matRef.current) {
            matRef.current.rotation.x = 0.0025 * 0.13;
            matRef.current.rotation.y += 0.005;
        }
    })

    useEffect(() => {
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                child.material = new ColorShiftMaterial();
            }
        });
    }, [gltf]);

    return <primitive position={position} scale={scale} ref={matRef} object={gltf.scene.clone()} />;
};


export default function Splash() {
    // MPsych Presentation Day! W MPsych! 67! Woohoo! W burritos! Ted Talk Vibes! Made by Blake Moody!
    return (
        <div className="w-full max-w-full h-screen flex items-center py-3 justify-center bg-secondary">
            <Background />
            
            <Banner speed={15}>MPsych Presentation Day! W MPsych! 67! Woohoo! W burritos! Ted Talk Vibes! Made by Blake Moody!</Banner>
            <div className="absolute bottom-[20px] right-[100px] w-[200px] h-[400px]">
                <Canvas>
                    <ambientLight intensity={Math.PI / 2} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
                    <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
                    <Model path="/mario.glb" position={[0, 0, -1]} scale={3} />
                </Canvas>

            </div>
            <div className="absolute w-screen h-screen">
                <Canvas>
                    <ambientLight intensity={Math.PI / 2} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
                    <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
                    <Model path="/mario_kart.glb" position={[0, 0, -2]} scale={5} />
                </Canvas>

            </div>
            <Links />
        </div>
    )
}