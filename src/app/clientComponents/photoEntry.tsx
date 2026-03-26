"use client"

import { Photo, ImageMediaMetadata } from "@/lib/types";
import { ReactNode, Suspense, useEffect, useState, useRef } from 'react';
import * as THREE from 'three'
import { Skeleton } from "@/components/ui/skeleton";
import plusJakartaSans from '../../../styles/fonts';
import Image from 'next/image';
import React from 'react';
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { useLoader } from "@react-three/fiber";
import { Environment, Html, OrbitControls } from "@react-three/drei";
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Dialog } from "radix-ui";
import { useGLTF, shaderMaterial } from '@react-three/drei';
import '../globals.css';
import Marquee from "react-fast-marquee";
import { 
    Calendar,
    Ruler,
    Camera,
    Aperture,
    Timer,
    Thermometer,
    Focus,
    ScanEye,
    Image as ImageIcon,
    File,
    Blend
 } from "lucide-react";

import {
    Drawer,
    DrawerClose,
    DrawerContent as GenericDrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerTitle,
} from "@/components/ui/drawer";

import { DrawerTrigger } from "./drawerTrigger";

import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { metadata } from "../layout";
import { Badge } from "@/components/ui/badge";
import HeavenlyMesh from "./heavenlyMesh";

function LoadingImage() {
    return (
        <div className="w-screen max-w-full h-[50vh] flex flex-col gap-3 h-full min-h-[200px] absolute top-0">
            <Skeleton className="h-full w-full flex-grow rounded-none" />
            <Skeleton className="h-[40px] w-full flex-grow rounded-none" />
        </div>
    )
}

function PhotoMetadataMiniView({ metadata }: { metadata: ImageMediaMetadata }) {
    return (
        <div className="font-mono text-xs border-primary absolute bottom-0 bg-secondary">
            <Marquee pauseOnHover className="border-t-1 border-primary flex flex-row items-center">
                <Badge className="bg-secondary text-primary">
                    <Calendar data-icon="inline-start" className="stroke-primary" />
                    {metadata.date?.replace(":", "/").replace(":", "/") || "?"}
                </Badge>
                <Badge className="bg-secondary text-primary">
                    <Focus data-icon="inline-start" className="stroke-primary" />
                    {metadata.date?.replace(":", "/").replace(":", "/") || "?"}
                </Badge>
                <Badge className="bg-secondary text-primary">
                    <Camera data-icon="inline-start" className="stroke-primary" />
                    {(metadata.width || "?") + " x " + (metadata.height || "?")}
                </Badge>
                <Badge className="bg-secondary text-primary">
                    <Aperture data-icon="inline-start" className="stroke-primary" />
                    {"f/" + metadata.aperture || "?"}
                </Badge>
                <Badge className="bg-secondary text-primary">
                    <Timer data-icon="inline-start" className="stroke-primary" />
                    {metadata.exposureTime + "s" || "?"}
                </Badge>
                <Badge className="bg-secondary text-primary">
                    <div className="bg-white border-1 border-black text-black text-[8px] px-1 py-0 ml-3 h-auto flex justify-center items-center text-center font-bold my-auto">ISO</div>
                    <div className="ml-3">{metadata.isoSpeed || "?"}</div>
                </Badge>
            </Marquee>
        </div>
    )
}

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

const Model = () => {
    const gltf = useGLTF("/a7.glb");
    const matRef = useRef<THREE.Mesh>(null!)

    useFrame(({ clock }) =>{
        if(matRef.current) {
            matRef.current.rotation.x = Math.PI / 2;
            matRef.current.rotation.z += 0.0025;
        }
    })

    // @ts-ignore
    return (<><mesh ref={matRef} geometry={gltf.meshes.model_2.geometry} scale={0.002} position={[0, -2, 0]}><colorShiftMaterial time={1} /></mesh></>
        
    );
};

function MetadataEntry({ title, value, children }: { title: string, value: number | string, children?: ReactNode }) {
    return (
        <div className="w-auto flex flex-row p-1 gap-3 items-center justify-center text-primary">
            {children}
            {title}
            {title != "" && <span className="w-[10px] h-[10px] rounded-full bg-primary scale-[50%]"></span>}
            {value}
        </div>
    )
}

function PhotoMetadataExpandedView({ metadata }: { metadata: ImageMediaMetadata & { fileSize: number, fileExtension: string } }) {
    

    

    return (
        <Card className="w-full h-full bg-secondary border-none rounded-none relative">
            <DrawerTitle className="hidden">
                Hello
            </DrawerTitle>
            <div className="grid grid-rows-2 h-full relative">
                <CardContent className="flex flex-col text-center lg:items-end text-white bg-transparent font-light">
                    <MetadataEntry title="" value={ metadata.date?.replace(":", "/").replace(":", "/") || "unknown"}>
                        <Calendar className="stroke-primary" width={15} height={15} />
                    </MetadataEntry>
                    <MetadataEntry title="" value={(metadata.width || "unknown") + " x " + (metadata.height || "unknown")}>
                        <Focus className="stroke-primary" width={15} height={15} />
                    </MetadataEntry>
                    <MetadataEntry title="" value={(metadata.cameraMake || "unknown") + " " + (metadata.cameraModel || "unknown")}>
                        <Camera className="stroke-primary" width={15} height={15} />
                    </MetadataEntry>
                    <MetadataEntry title="aperture" value={"f/" + metadata.aperture || "unknown"}>
                        <Aperture className="stroke-primary" width={15} height={15} />
                    </MetadataEntry>
                    <MetadataEntry title="shutter speed" value={metadata.exposureTime + "s" || "unknown"}>
                        <Timer className="stroke-primary" width={15} height={15} />
                    </MetadataEntry>
                    <MetadataEntry title="" value={metadata.isoSpeed || "unknown"}>
                        <div className="bg-secondary border-1 border-primary text-primary text-[10px] px-1 flex justify-center items-center text-center font-bold">ISO</div>
                    </MetadataEntry>
                    <MetadataEntry title="focal length" value={metadata.focalLength + "mm" || "unknown"}>
                        <Ruler className="stroke-primary" width={15} height={15} />
                    </MetadataEntry>
                    <MetadataEntry title="white balance" value={metadata.whiteBalance || "unknown"}>
                        <Thermometer className="stroke-primary" width={15} height={15} />
                    </MetadataEntry>
                    <MetadataEntry title="exposure mode" value={metadata.exposureMode || "unknown"}>
                        <ScanEye className="stroke-primary" width={15} height={15} />
                    </MetadataEntry>
                    <MetadataEntry title="color space" value={ metadata.colorSpace || "unknown"}>
                        <Blend className="stroke-primary" width={15} height={15} />
                    </MetadataEntry>
                    <MetadataEntry title="file type" value={ metadata.fileExtension || "unknown"}>
                        <ImageIcon className="stroke-primary" width={15} height={15} />
                    </MetadataEntry>
                    <MetadataEntry title="size" value={ Math.trunc(metadata.fileSize / 10000) / 100 + "MB" || "unknown"}>
                        <File className="stroke-primary" width={15} height={15} />
                    </MetadataEntry>
                </CardContent>
                <div className="w-full">
                    <Canvas>
                        <ambientLight intensity={Math.PI / 2} />
                        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
                        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
                        <Model />
                    </Canvas>
                </div>
                
            </div>
        </Card>
    )
}

function PhotoExpandedView({ photo }: { photo: Photo }) {
    const [windowDim, setWindowDim] = useState<{width: number, height: number}>({width: 0, height: 0});
    
    useEffect(() => {
        setWindowDim({width: window.innerWidth, height: window.innerHeight});
    }, [])

    return (
        <GenericDrawerContent style={{borderRadius: "0px"}} className="h-5/6 w-full bg-secondary border-t-1 border-primary">
            <div className="flex flex-col lg:flex-row-reverse overflow-y-scroll mt-3 lg:h-full ">
                <Image src={photo.webContentLink} alt={`photobook-${photo.webContentLink}`}
                    width={0}
                    height={0}
                    sizes="100vw"
                    style={{width: windowDim.width < 1024 ? "100%" : "auto", height: windowDim.width < 1024 ? "auto" : "100%"}}
                    />
                <PhotoMetadataExpandedView metadata={{
                    ...photo.imageMediaMetadata,
                    fileSize: photo.fileSize as unknown as number,
                    fileExtension: photo.fileExtension
                }} />
            </div>
        </GenericDrawerContent>
    )
}

function PhotoMiniView({ photo }: { photo: Photo }) {
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <div className="rounded-none border-primary border-1 border-b-1 border-b-secondary flex text-left flex-col justify-between h-full z-auto">
            <div className="flex flex-col w-full max-w-full h-full overflow-x-hidden relative">
                <Image className="transition-all duration-1000 object-cover" src={photo.webContentLink} alt={`photobook-${photo.webContentLink}`}
                    onLoad={() => setIsLoaded(true)}
                    fill
                    sizes="100vh"
                    style={{objectFit: "cover", opacity: isLoaded ? "1" : "0" }} />
                <PhotoMetadataMiniView metadata={photo.imageMediaMetadata} />
            </div>
            {!isLoaded && <LoadingImage />}
            <DrawerTrigger className="border-b-1" label="view photo details" />
        </div>
    )

}

export function CameraMesh() {
    const [isFocused, setIsFocused] = useState(false);
    
    return (
        <div className="w-full h-full" onMouseEnter={() => setIsFocused(true)} onMouseLeave={() => setIsFocused(false)}>
            <HeavenlyMesh meshPath="/a7.stl" focus={isFocused} scale={0.1} />
        </div>
    )
}

export default function PhotoEntry({ photo }: { photo: Photo }) {
    return (
        <Drawer>
            <PhotoMiniView photo={photo} />
            <PhotoExpandedView photo={photo} />
        </Drawer>
    )
}