"use client"

import { Photo, ImageMediaMetadata } from "@/lib/types";
import { photoDescription, photoDimensions } from "@/lib/photos";
import { useState, useRef } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import Image from 'next/image';
import '../globals.css';
import styles from '../../../styles/PhotoDetails.module.css';
import Marquee from "react-fast-marquee";
import { 
    Calendar,
    Camera,
    Aperture,
    Timer,
    Focus,
    X
 } from "lucide-react";

import {
    Drawer,
    DrawerClose,
    DrawerContent as GenericDrawerContent,
    DrawerDescription,
    DrawerTitle,
} from "@/components/ui/drawer";

import { DrawerTrigger } from "./drawerTrigger";

import { Badge } from "@/components/ui/badge";

function PhotoMetadataMiniView({ metadata }: { metadata: ImageMediaMetadata }) {
    return (
        <div className="w-full font-mono text-xs border-primary absolute bottom-0 bg-secondary max-sm:hidden">
            <Marquee pauseOnHover className="border-t-1 border-primary flex flex-row items-center">
                <Badge className="bg-secondary text-primary">
                    <Calendar data-icon="inline-start" className="stroke-primary" />
                    {metadata.date?.replace(":", "/").replace(":", "/") || "?"}
                </Badge>
                <Badge className="bg-secondary text-primary">
                    <Focus data-icon="inline-start" className="stroke-primary" />
                    {metadata.focalLength ? `${metadata.focalLength}mm` : "?"}
                </Badge>
                <Badge className="bg-secondary text-primary">
                    <Camera data-icon="inline-start" className="stroke-primary" />
                    {(metadata.width || "?") + " x " + (metadata.height || "?")}
                </Badge>
                <Badge className="bg-secondary text-primary">
                    <Aperture data-icon="inline-start" className="stroke-primary" />
                    {metadata.aperture ? `f/${metadata.aperture}` : "?"}
                </Badge>
                <Badge className="bg-secondary text-primary">
                    <Timer data-icon="inline-start" className="stroke-primary" />
                    {metadata.exposureTime != null ? `${metadata.exposureTime}s` : "?"}
                </Badge>
                <Badge className="bg-secondary text-primary">
                    <div className="bg-white border-1 border-black text-black text-[8px] px-1 py-0 ml-3 h-auto flex justify-center items-center text-center font-bold my-auto">ISO</div>
                    <div className="ml-3">{metadata.isoSpeed || "?"}</div>
                </Badge>
            </Marquee>
        </div>
    )
}

const unavailable = "Not recorded";

function metadataText(value: unknown): string {
    return typeof value === "string" && value.trim() && !/^(undefined|null|nan|invalid date)$/i.test(value.trim())
        ? value.trim() : unavailable;
}

function metadataNumber(value: unknown, suffix = "", prefix = "", allowZero = false): string {
    return typeof value === "number" && Number.isFinite(value) && (allowZero || value > 0)
        ? `${prefix}${Number(value.toPrecision(6))}${suffix}` : unavailable;
}

function captureDate(value: unknown): string {
    const text = metadataText(value).replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
    return Number.isFinite(Date.parse(text)) ? text.replace("T", " ") : unavailable;
}

function fileSize(value: unknown): string {
    const bytes = typeof value === "string" && value.trim() ? Number(value) : value;
    if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) return unavailable;
    return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(2)} MB`
        : bytes >= 1_000 ? `${(bytes / 1_000).toFixed(1)} kB` : `${bytes} B`;
}

function MetadataGroup({ title, entries }: { title: string; entries: [string, string][] }) {
    return (
        <section className={styles.group} aria-label={title}>
            <h3>{title}</h3>
            <dl>{entries.map(([label, value]) => (
                <div className={styles.entry} key={label}>
                    <dt>{label}</dt><dd>{value}</dd>
                </div>
            ))}</dl>
        </section>
    );
}

function PhotoMetadataExpandedView({ photo }: { photo: Photo }) {
    const metadata = photo.imageMediaMetadata;
    const exposure = metadata?.exposureTime;
    const shutter = typeof exposure === "number" && Number.isFinite(1 / exposure) && exposure > 0 && exposure < 1
        ? `1/${Number((1 / exposure).toPrecision(4))} s` : metadataNumber(exposure, " s");
    const format = metadataText(photo.fileExtension);

    return (
        <aside className={styles.metadata} aria-label="Photo metadata" tabIndex={0}>
            <MetadataGroup title="Camera / lens" entries={[
                ["Make", metadataText(metadata?.cameraMake)],
                ["Camera", metadataText(metadata?.cameraModel)],
                ["Lens", metadataText(metadata?.lens)],
            ]} />
            <MetadataGroup title="Capture settings" entries={[
                ["Taken", captureDate(metadata?.date)],
                ["Aperture", metadataNumber(metadata?.aperture, "", "f/")],
                ["Shutter", shutter],
                ["ISO", metadataNumber(metadata?.isoSpeed)],
                ["Focal length", metadataNumber(metadata?.focalLength, " mm")],
                ["Exposure", metadataText(metadata?.exposureMode)],
                ["White balance", metadataText(metadata?.whiteBalance)],
                ...(metadata?.exposureBias != null ? [["Compensation", metadataNumber(metadata.exposureBias, " EV", "", true)] as [string, string]] : []),
                ...(metadata?.meteringMode ? [["Metering", metadataText(metadata.meteringMode)] as [string, string]] : []),
                ...(typeof metadata?.flashUsed === "boolean" ? [["Flash", metadata.flashUsed ? "Fired" : "Did not fire"] as [string, string]] : []),
                ...(metadata?.maxApertureValue != null ? [["Max aperture (APEX)", metadataNumber(metadata.maxApertureValue, "", "", true)] as [string, string]] : []),
            ]} />
            <MetadataGroup title="File info" entries={[
                ["Dimensions", metadataNumber(metadata?.width) !== unavailable && metadataNumber(metadata?.height) !== unavailable
                    ? `${metadata.width} × ${metadata.height} px` : unavailable],
                ["Format", format === unavailable ? unavailable : format.toUpperCase()],
                ["Size", fileSize(photo.fileSize)],
                ["Color space", metadataText(metadata?.colorSpace)],
            ]} />
        </aside>
    );
}

function PhotoExpandedView({ photo }: { photo: Photo }) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const invokingControl = useRef<HTMLElement | null>(null);
    const [hasError, setHasError] = useState(false);
    const { width, height } = photoDimensions(photo);

    return (
        <GenericDrawerContent className={styles.drawer} onOpenAutoFocus={(event) => {
            event.preventDefault();
            invokingControl.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            setHasError(false);
            closeRef.current?.focus();
        }} onCloseAutoFocus={(event) => {
            if (invokingControl.current?.isConnected) {
                event.preventDefault();
                invokingControl.current.focus({ preventScroll: true });
            }
        }}>
            <header className={styles.header}>
                <DrawerTitle className={styles.title}>Photo details</DrawerTitle>
                <DrawerClose ref={closeRef} className={styles.close} aria-label="Close photo details">
                    <X size={16} aria-hidden="true" /> Close
                </DrawerClose>
            </header>
            <DrawerDescription className="sr-only">Full photograph and camera settings.</DrawerDescription>
            <div className={styles.content} data-vaul-no-drag>
                <figure className={styles.figure}>
                    {hasError ? <div role="status" className={styles.imageError}>Photo unavailable. Close and reopen to try again.</div> :
                        <Image src={photo.webContentLink} alt={photoDescription(photo)}
                            width={width} height={height}
                            sizes="(min-width: 1024px) calc(100vw - 376px), calc(100vw - 24px)"
                            className={styles.image} onError={() => setHasError(true)} />}
                </figure>
                <PhotoMetadataExpandedView photo={photo} />
            </div>
        </GenericDrawerContent>
    )
}

function PhotoMiniView({ photo, featured }: { photo: Photo; featured: boolean }) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [dimensions, setDimensions] = useState(() => photoDimensions(photo));
    const { width, height } = dimensions;
    const description = photoDescription(photo);

    return (
        <div data-photo-id={photo.id} className="relative w-full rounded-none border-primary sm:border sm:border-b-0 text-left bg-secondary">
            <div className="w-full overflow-hidden relative" style={{ aspectRatio: `${width} / ${height}` }}>
                {!hasError && <Image className="transition-opacity duration-1000 motion-reduce:transition-none object-cover" src={photo.webContentLink} alt={description}
                    onLoad={(event) => {
                        const image = event.currentTarget;
                        // Decoded dimensions win if imported metadata has already
                        // applied orientation, or if its dimensions were missing.
                        if (image.naturalWidth && image.naturalHeight && Math.abs(image.naturalWidth / image.naturalHeight - width / height) > .01) {
                            setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
                        }
                        setIsLoaded(true);
                    }}
                    onError={() => setHasError(true)}
                    fill
                    sizes={featured
                        ? "(max-width: 639px) calc((200vw - 53px) / 3), calc((200vw - 60px) / 3)"
                        : "(max-width: 639px) calc((100vw - 28px) / 3), calc((100vw - 48px) / 3)"}
                    style={{objectFit: "cover", opacity: isLoaded ? "1" : "0" }} />}
                {!isLoaded && !hasError && <Skeleton className="absolute inset-0 rounded-none" />}
                {hasError && <div role="status" className="absolute inset-0 flex items-center justify-center bg-secondary p-2 text-center text-xs text-muted-foreground">Photo unavailable</div>}
                {photo.imageMediaMetadata && <PhotoMetadataMiniView metadata={photo.imageMediaMetadata} />}
            </div>
            <DrawerTrigger className="border-b-1 max-sm:hidden" label="view photo details" ariaLabel={`View photo: ${description}`} />
            <div className="sm:hidden absolute top-2 right-2">
                <DrawerTrigger className="border-b-1 sm:hidden border h-11 min-h-11 min-w-11" label="" ariaLabel={`View photo: ${description}`} />
            </div>
        </div>
    )

}

export default function PhotoEntry({ photo, featured = false }: { photo: Photo; featured?: boolean }) {
    return (
        <Drawer>
            <PhotoMiniView key={photo.webContentLink} photo={photo} featured={featured} />
            <PhotoExpandedView photo={photo} />
        </Drawer>
    )
}
