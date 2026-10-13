"use client";

import { useEffect, useMemo, useRef } from "react";
import type Masonry from "masonry-layout";
import type { Photo } from "@/lib/types";
import { masonryPhotos } from "@/lib/photos";
import PhotoEntry from "./photoEntry";
import styles from "../../../styles/PhotoMasonry.module.css";

export default function PhotoMasonry({ photos, featuredIds }: { photos: Photo[]; featuredIds: string[] }) {
    const images = useMemo(() => masonryPhotos(photos), [photos]);
    const container = useRef<HTMLDivElement>(null);
    const featured = useMemo(() => new Set(featuredIds), [featuredIds]);

    useEffect(() => {
        const node = container.current;
        if (!node) return;
        let disposed = false;
        let engine: Masonry | undefined;
        let observer: ResizeObserver | undefined;
        let frame = 0;
        import("masonry-layout").then(({ default: MasonryLayout }) => {
            if (disposed) return;
            node.dataset.layout = "masonry";
            engine = new MasonryLayout(node, {
                itemSelector: `.${styles.item}`,
                columnWidth: `.${styles.columnSizer}`,
                gutter: `.${styles.gutterSizer}`,
                percentPosition: true,
                transitionDuration: 0,
                resize: false,
            });
            observer = new ResizeObserver(() => {
                cancelAnimationFrame(frame);
                frame = requestAnimationFrame(() => engine?.layout?.());
            });
            observer.observe(node);
            node.querySelectorAll(`.${styles.item}`).forEach((item) => observer?.observe(item));
        }).catch(() => {
            if (disposed) return;
            // Keep the server-rendered grid usable if the enhancement cannot load.
            engine?.destroy?.();
            delete node.dataset.layout;
        });
        return () => {
            disposed = true;
            observer?.disconnect();
            cancelAnimationFrame(frame);
            engine?.destroy?.();
            delete node.dataset.layout;
        };
    }, [images, featuredIds]);

    if (!images.length) return <p className="border border-primary p-3 text-sm text-muted-foreground">No photographs to show yet.</p>;

    return (
        <div ref={container} className={styles.gallery} role="group" aria-label="Photographs">
            <div className={styles.columnSizer} aria-hidden="true" />
            <div className={styles.gutterSizer} aria-hidden="true" />
            {images.map((image) => <div key={image.key} className={`${styles.item} ${featured.has(image.key) ? styles.featured : ""}`} data-featured={featured.has(image.key)}>
                <PhotoEntry photo={image.source} featured={featured.has(image.key)} />
            </div>)}
        </div>
    );
}
