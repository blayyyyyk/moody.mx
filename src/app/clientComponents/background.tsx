"use client"
import * as THREE from 'three'
import { createRoot } from 'react-dom/client'
import React, { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber';
import { Plane } from '@react-three/drei';
import { shaderMaterial } from '@react-three/drei';
import { useThree } from '@react-three/fiber'
import { Environment, Html, OrbitControls } from "@react-three/drei";

const getDefaultUniforms = () => {
    return {
        u_time: { value: 0.0 },
    }
}

const initialUniforms = {
	...getDefaultUniforms(),
	u_pointsize: { value: 2.0 },
	u_step: { value: 5.0 },
	// wave 1
	u_noise_freq_1: { value: 5 },
	u_noise_amp_1: { value: 0.9 },
	u_spd_modifier_1: { value: 0.1 },
	// wave 2
	u_noise_freq_2: { value: 8 },
	u_noise_amp_2: { value: 0.5 },
	u_spd_modifier_2: { value: 0.08 }
}

export function useAspect(width: number, height: number, factor: number = 1): [number, number, number] {
	const v = useThree((state) => state.viewport)
	const adaptedHeight = height * (v.aspect > width / height ? v.width / width : v.height / height)
	const adaptedWidth = width * (v.aspect > width / height ? v.width / width : v.height / height)
	return [adaptedWidth * factor, adaptedHeight * factor, 1]
}

function Box(props: ThreeElements['mesh']) {
	const matRef = useRef<THREE.ShaderMaterial>(null!)
	const v = useThree((state) => state.viewport)
	const [scale, setScale] = useState<[number, number, number]>([0, 0, 0]);

	useEffect(() => {
		const width = window.innerWidth;
		const height = window.innerHeight;
		const adaptedHeight = height * (v.aspect > width / height ? v.width / width : v.height / height)
		const adaptedWidth = width * (v.aspect > width / height ? v.width / width : v.height / height)
		setScale( [adaptedWidth, adaptedHeight, 1]);
	}, [])

	useFrame(({ clock }) =>{
		if(matRef.current) {
			matRef.current.uniforms.u_time = {value: clock.getElapsedTime()};
		}
	})

	return (
		<Plane scale={scale} args={[1, 1, 512, 512]}>
			<shaderMaterial
				ref={matRef}
				attach='material'
				vertexShader={vertexShader}
				fragmentShader={fragmentShader}
				uniforms={initialUniforms} />
		</Plane>
	)
}

const vertexShader = `
#define PI 3.14159265359

uniform float u_time;
uniform float u_pointsize;
uniform float u_noise_amp_1;
uniform float u_noise_freq_1;
uniform float u_spd_modifier_1;
uniform float u_noise_amp_2;
uniform float u_noise_freq_2;
uniform float u_spd_modifier_2;

// 2D Random
float random (in vec2 st) {
	return fract(sin(dot(st.xy,
						vec2(12.9898,78.233)))
				* 43758.5453123);
}

// 2D Noise based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 st) {
	vec2 i = floor(st);
	vec2 f = fract(st);

	// Four corners in 2D of a tile
	float a = random(i);
	float b = random(i + vec2(1.0, 0.0));
	float c = random(i + vec2(0.0, 1.0));
	float d = random(i + vec2(1.0, 1.0));

	// Smooth Interpolation

	// Cubic Hermine Curve.  Same as SmoothStep()
	vec2 u = f*f*(3.0-2.0*f);
	// u = smoothstep(0.,1.,f);

	// Mix 4 coorners percentages
	return mix(a, b, u.x) +
			(c - a)* u.y * (1.0 - u.x) +
			(d - b) * u.x * u.y;
}

mat2 rotate2d(float angle){
	return mat2(cos(angle),-sin(angle),
			sin(angle),cos(angle));
}

varying vec4 _pos;

void main() {
	gl_PointSize = u_pointsize;

	vec3 pos = position;
	// pos.xy is the original 2D dimension of the plane coordinates
	pos.z += noise(pos.xy * u_noise_freq_1 + u_time * u_spd_modifier_1) * u_noise_amp_1;
	// add noise layering
	// minus u_time makes the second layer of wave goes the other direction
	pos.z += noise(rotate2d(PI / 4.) * pos.yx * u_noise_freq_2 - u_time * u_spd_modifier_2 * 0.6) * u_noise_amp_2;

	vec4 mvm = modelViewMatrix * vec4(pos, 1.0);
	gl_Position = projectionMatrix * mvm;
	_pos = gl_Position;
}
`;

const fragmentShader = `
#ifdef GL_ES
precision mediump float;
#endif

varying vec4 _pos;

void main() {
	float f  = fract (_pos.y * 50.0);
	float df = fwidth(_pos.z * 100.0);

	float g = smoothstep(df * 1.0, df * 1.0, f);

	float c = g;

	gl_FragColor = vec4((1.0 - c) * 0.5, (1.0 - c) * 0.5, (1.0 - c) * 0.5, (1.0 - c));
}
`

export default function Background() {
    return (
		<div className="absolute w-full h-screen top-0 left-0">
			<Canvas className="absolute top-0 left-0">
				
				
				
				<Box />
			</Canvas>
		</div>
        
    )

}