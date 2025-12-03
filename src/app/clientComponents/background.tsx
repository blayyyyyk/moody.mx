"use client"
import * as THREE from 'three'
import React, { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Plane } from '@react-three/drei'

// =============================================================
// 1. ORIGINAL UNBROKEN TOPOGRAPHICAL SHADER (unchanged)
// =============================================================

const getDefaultUniforms = () => {
	return {
		u_time: { value: 0.0 },
	}
}

const initialUniforms = {
	...getDefaultUniforms(),
	u_pointsize: { value: 2.0 },
	u_step: { value: 5.0 },
	u_noise_freq_1: { value: 4.0 },
	u_noise_amp_1: { value: 0.3 },
	u_spd_modifier_1: { value: 0.01 },
	u_noise_freq_2: { value: 4.0 },
	u_noise_amp_2: { value: 0.2 },
	u_spd_modifier_2: { value: 0.08 }
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

float random (in vec2 st) {
	return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise (in vec2 st) {
	vec2 i = floor(st);
	vec2 f = fract(st);
	float a = random(i);
	float b = random(i + vec2(1.0, 0.0));
	float c = random(i + vec2(0.0, 1.0));
	float d = random(i + vec2(1.0, 1.0));
	vec2 u = f*f*(3.0-2.0*f);
	return mix(a, b, u.x) +
		   (c - a)* u.y * (1.0 - u.x) +
		   (d - b) * u.x * u.y;
}

mat2 rotate2d(float angle){
	return mat2(cos(angle),-sin(angle),
			    sin(angle), cos(angle));
}

varying vec4 _pos;

void main() {
	gl_PointSize = u_pointsize;

	vec3 pos = position;
	pos.z += noise(pos.xy * u_noise_freq_1 + u_time * u_spd_modifier_1) * u_noise_amp_1;
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
	float f  = fract (_pos.z * 50.0);
	float df = fwidth(_pos.z * 100.0);
	float g = smoothstep(df * 5.0, df * 5.0, f);
	float c = g;

	gl_FragColor = vec4((1.0 - c) * 0.5, (1.0 - c) * 0.5, (1.0 - c) * 0.5, df * 5.0f);
}
`

// =============================================================
// 2. PASS 1: Render Topographical Map to a Texture
// =============================================================

function TopoPass({ rt }: { rt: any }) {
	const matRef = useRef()
	const { viewport } = useThree()
	const [scale, setScale] = useState<[number, number, number]>([0, 0, 0]);

	useEffect(() => {
		const width = window.innerWidth
		const height = window.innerHeight
		const adaptedHeight = height * (viewport.aspect > width / height ? viewport.width / width : viewport.height / height)
		const adaptedWidth = width * (viewport.aspect > width / height ? viewport.width / width : viewport.height / height)
		setScale([adaptedWidth, adaptedHeight, 1])
	}, [viewport])

	useFrame(({ gl, scene, camera, clock }) => {
		if (matRef.current) {
			// @ts-ignore
			matRef.current!.uniforms.u_time.value = clock.getElapsedTime();
		}

		// Render topo shader into the RenderTarget
		gl.setRenderTarget(rt)
		gl.render(scene, camera)
		gl.setRenderTarget(null)
	})

	return (
		<Plane scale={scale} args={[1, 1, 512, 512]}>
			<shaderMaterial
				ref={matRef}
				attach="material"
				vertexShader={vertexShader}
				fragmentShader={fragmentShader}
				uniforms={initialUniforms}
			/>
		</Plane>
	)
}

// =============================================================
// 3. PASS 2: ASCII Post-processing Shader
// =============================================================

const asciiVertex = `
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = vec4(position, 1.0);
}
`

const asciiFragment = `
#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D u_tex;
varying vec2 vUv;

float character(int n, vec2 p) {
	p = floor(p * vec2(-4.0f, 4.0f) + 2.5f);
	if(clamp(p.x, 0.0f, 4.0f) == p.x) {
			if(clamp(p.y, 0.0f, 4.0f) == p.y) {
			int a = int(round(p.x) + 5.0f * round(p.y));
			if(((n >> a) & 1) == 1)
				return 1.0f;
		}
	}
	return 0.0f;
}

void main() {
	vec2 pix = gl_FragCoord.xy;
	vec2 textureDimensions = vec2(textureSize(u_tex, 0)) * 2.0f;
	vec4 s = texture(u_tex, floor(pix / 16.0f) * 16.0f / textureDimensions.xy).rgba;
	vec3 col = s.rgb;
	float g = s.a;

	int n = 4096;

	if (g > 0.033)  n = 32768;      // .
	if (g > 0.066)  n = 34816;      // \`
	if (g > 0.099)  n = 65600;      // :
	if (g > 0.132)  n = 65792;      // ;
	if (g > 0.165)  n = 34952;      // l
	if (g > 0.198)  n = 17476;      // i
	if (g > 0.231)  n = 32512;      // ~
	if (g > 0.264)  n = 34176;      // +
	if (g > 0.297)  n = 14843136;   // ?
	if (g > 0.330)  n = 13120056;   // }
	if (g > 0.363)  n = 17476;      // |
	if (g > 0.396)  n = 35968;      // t
	if (g > 0.429)  n = 23168;      // j
	if (g > 0.462)  n = 34960;      // u
	if (g > 0.495)  n = 32512;      // z
	if (g > 0.528)  n = 35984;      // Y
	if (g > 0.561)  n = 34952;      // U
	if (g > 0.594)  n = 32784;      // L
	if (g > 0.627)  n = 15252014;   // 0
	if (g > 0.660)  n = 32512;      // Z
	if (g > 0.693)  n = 34960;      // w
	if (g > 0.726)  n = 14843904;   // q
	if (g > 0.759)  n = 34960;      // b
	if (g > 0.792)  n = 34952;      // h
	if (g > 0.825)  n = 163153;     // *
	if (g > 0.858)  n = 34944;      // W
	if (g > 0.891)  n = 15252014;   // 8
	if (g > 0.924)  n = 14844200;   // %
	if (g > 0.957)  n = 13195790;   // @

	vec2 p = mod(pix / 8.0f, 2.0f) - vec2(1.0f);
	col = col * character(n, p);
	gl_FragColor = vec4(col, 1.0);
}
`

function AsciiPass({ rt }: { rt: any }) {
	return (
		<mesh>
			<planeGeometry args={[2, 2]} />
			<shaderMaterial
				vertexShader={asciiVertex}
				fragmentShader={asciiFragment}
				uniforms={{ u_tex: { value: rt.texture } }}
				transparent={true}
			/>
		</mesh>
	)
}

// =============================================================
// 4. MAIN BACKGROUND COMPONENT WITH BOTH PASSES
// =============================================================

function getWindowDimensions() {
	
	
	if (typeof window !== "undefined") {
		// Client-side-only code
		const { innerWidth: width, innerHeight: height } = window;
		return {
			width,
			height
		};
	} else {
		return {width: 0, height: 0};
	}
  }

export default function Background() {
	const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

	const rt = new THREE.WebGLRenderTarget(windowDimensions.width, windowDimensions.height, {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat,
	})

	return (
		<div className="absolute w-screen h-screen top-0 left-0">
			<Canvas>
				{/* Pass 1: generate topo texture */}
				<TopoPass rt={rt} />

				{/* Pass 2: ASCII shader sampling topo texture */}
				<AsciiPass rt={rt} />
			</Canvas>
		</div>
	)
}
