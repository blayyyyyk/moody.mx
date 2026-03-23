"use client"
import * as THREE from 'three'
import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Plane } from '@react-three/drei'
import { AsciiEffect } from 'three-stdlib'

// =============================================================
// 1. SHADERS & UNIFORMS (Unchanged)
// =============================================================

const getDefaultUniforms = () => {
    return {
        u_time: { value: 0.0 },
        u_mousepos: { value: [0.0, 0.0] },
        u_resolution: { value: [0.0, 0.0] }
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
uniform vec2 u_mousepos;
uniform vec2 u_resolution;

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
varying float mouse_dist;

void main() {
    gl_PointSize = u_pointsize;

    float aspect_ratio = u_resolution.y / u_resolution.x;

    vec3 pos = position;
    pos.z += noise(pos.xy * u_noise_freq_1 + u_time * u_spd_modifier_1) * u_noise_amp_1;
    pos.z += noise(rotate2d(PI / 4.) * pos.yx * u_noise_freq_2 - u_time * u_spd_modifier_2 * 0.6) * u_noise_amp_2;

    float x_delta = u_mousepos.x - pos.x;
    float y_delta = (u_mousepos.y - pos.y) * aspect_ratio;
    mouse_dist = sqrt(x_delta * x_delta + y_delta * y_delta);

    float radius = 0.06;
    if (mouse_dist < radius) {
        pos.z *= (1.0 + radius) - mouse_dist;
    }

    vec4 mvm = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvm;
    _pos = gl_Position;
}
`;

const fragmentShader = `
#ifdef GL_ES
precision highp float;
#endif

uniform vec2 u_mousepos;
uniform float u_time;

varying vec4 _pos;
varying float mouse_dist;

float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 78.233))) * 43758.5453);
}

float smoothSparkle(vec2 xy, float t) {
    float t0 = floor(t);
    float t1 = t0 + 1.0;
    float r0 = rand(xy + t0 * 0.1);
    float r1 = rand(xy + t1 * 0.1);
    float f = fract(t);
    f = f * f * (3.0 - 2.0 * f);
    return mix(r0, r1, f);
}

void main() {
    float f  = fract(_pos.z * 50.0);
    float df = fwidth(_pos.z * 100.0);
    float g  = smoothstep(df * 5.0, df * 5.0, f);

    // Adjusted color slightly so AsciiEffect has enough contrast to work with
    vec4 c = vec4((1.0 - g) * f,
                  (1.0 - g) * f,
                  (1.0 - g) * f,
                  _pos.z * 10.0 - 43.9);

    // float prob = clamp(1.0 - mouse_dist / 0.3, 0.0, 1.0);
    // float sparkle = smoothSparkle(gl_FragCoord.xy * 0.5, u_time * 0.5);

    // if (sparkle < prob) {
    //     if (mod(mouse_dist, 0.01) < 0.08) {
    //         c.rgb += vec3(0.0, 0.3, 1.0)
    //             +  vec3(0.5, 0.0, 0.0) * (_pos.z * 10.0 - 43.9);
    //     }
    // }

    gl_FragColor = c;
}
`

// =============================================================
// 2. THE THREE.JS ASCII EFFECT WRAPPER
// =============================================================

function AsciiRenderer({ 
  characters = ' .:*o&8@B', 
  ...options 
}) {
  const { gl, scene, camera, size } = useThree()

  const effect = useMemo(() => {
    const e = new AsciiEffect(gl, characters, options)
    e.domElement.classList.add(
          'absolute',
          'top-0',
          'left-0',
          'pointer-events-none',
          'bg-secondary',    // Your custom Tailwind background color
          'text-primary'     // Or 'text-secondary', 'text-accent', etc.
    )
    return e
  }, [characters, options, gl])

  useEffect(() => {
    gl.domElement.parentNode.appendChild(effect.domElement)
    return () => {
        if (gl.domElement.parentNode) {
            gl.domElement.parentNode.removeChild(effect.domElement)
        }
    }
  }, [effect, gl])

  useEffect(() => {
    effect.setSize(size.width, size.height)
  }, [effect, size])

  useFrame(() => {
    effect.render(scene, camera)
  }, 1) // Priority 1 ensures standard R3F render is skipped

  return null
}

// =============================================================
// 3. TOPO MAP (Refactored to standard rendering)
// =============================================================

function TopoPass() {
    const matRef = useRef()
    const { viewport } = useThree()
    const [scale, setScale] = useState([0, 0, 1]);
    const mousePos = useRef([0.0, 0.0]);

    useEffect(() => {
        const width = window.innerWidth
        const height = window.innerHeight
        const adaptedHeight = height * (viewport.aspect > width / height ? viewport.width / width : viewport.height / height)
        const adaptedWidth = width * (viewport.aspect > width / height ? viewport.width / width : viewport.height / height)
        setScale([adaptedWidth, adaptedHeight, 1]);

        if (matRef.current) {
            matRef.current.uniforms.u_resolution.value = [width, height];
        }
    }, [viewport])

    useEffect(() => {
        const handleMouseMove = (event) => {
            mousePos.current = [
                event.clientX / window.innerWidth - 0.5, 
                -(event.clientY / window.innerHeight - 0.5)
            ];
        };
        
        document.addEventListener('mousemove', handleMouseMove)
        return () => document.removeEventListener('mousemove', handleMouseMove) // Added cleanup
    }, [])

    useFrame(({ clock }) => {
        if (matRef.current) {
            matRef.current.uniforms.u_time.value = clock.getElapsedTime();
            matRef.current.uniforms.u_mousepos.value = mousePos.current;
        }
        // Notice we REMOVED the RenderTarget logic here entirely.
        // It now renders normally to the scene.
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
// 4. MAIN COMPONENT
// =============================================================

export default function Background() {
    return (
        <div className="absolute w-screen h-screen top-0 left-0 bg-black">
            <Canvas>
                <TopoPass />
                
                {/* Injects the Ascii DOM element over the canvas.
                    I mapped your custom character set from your old shader!
                */}
                <AsciiRenderer characters=" .:*o&8@B" invert={true} />
            </Canvas>
        </div>
    )
}