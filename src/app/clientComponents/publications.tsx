"use client";
import Heading from "./heading";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Edges, Center } from "@react-three/drei";
import { STLLoader } from "three-stdlib";
import { useRef, useState, useEffect, useMemo, Suspense } from "react";
import { hslToHex } from "@/lib/utils";
import * as THREE from "three";
import HeavenlyMesh from "./heavenlyMesh";
import PublicationsList from "../serverComponents/publicationsList";
// =============================================================
// 2. THE MAIN LAYOUT
// =============================================================

export default function Publications({ children }: {children: any}) {
    const [focus, setFocus] = useState(false);
    
    return (
        <div className="w-auto h-auto mx-3 flex flex-col gap-3 mb-3">
            <Heading className="border-primary border-1 p-3 text-wrap">
                Publications
            </Heading>

            <div className="w-full h-[50vh] grid grid-cols-1 grid-rows-2 md:grid-cols-3 md:grid-rows-1 gap-3">
                <div className="w-full h-full col-span-1 md:col-span-2 border-1 border-primary">
                    { children }
                </div>

                <div className="w-full h-full col-span-1 border-1 border-primary relative bg-secondary"  onMouseEnter={() => setFocus(true)} onMouseLeave={() => setFocus(false)}>
                    <HeavenlyMesh meshPath="/simplify_Enchiridion_.stl" focus={focus} />
                    
                </div>
            </div>
        </div>
    );
}
