import type { Photo } from "@/lib/types";
import { connection } from "next/server";
import { fetchDrivePhotos } from "@/lib/drive-photos";
import { featuredPhotoIds } from "@/lib/photos";
import PhotoMasonry from "../clientComponents/photoMasonry";
import ModelCameraViews from "../clientComponents/modelCameraViews";
import CameraArtPrototype from "../clientComponents/cameraArtPrototype";
import Heading from "../clientComponents/heading";
import styles from "../../../styles/PhotoMasonry.module.css";

export default async function Photobook() {
    // Re-roll the featured selection per request, while caching Drive metadata.
    await connection();
    const folderId = process.env.NEXT_PUBLIC_SHARED_FOLDER_ID;
    let photos: Photo[] = [];
    let unavailable = false;
    try {
        if (folderId) photos = await fetchDrivePhotos(folderId);
    } catch {
        unavailable = true;
    }
    return (
        <section className="w-full px-3" aria-labelledby="photos">
            <Heading className="border-primary border-1 p-3 text-wrap mb-3 scroll-mt-[90px] md:scroll-mt-12">Photos</Heading>
            <div className={styles.frame}>
                {process.env.NODE_ENV === "development" ? <CameraArtPrototype /> : <ModelCameraViews />}
                {unavailable
                    ? <p role="status" className="border border-primary p-3 text-sm text-muted-foreground">The photo library is temporarily unavailable. Please refresh to try again.</p>
                    : <PhotoMasonry photos={photos} featuredIds={featuredPhotoIds(photos)} />}
            </div>
        </section>
    );
}
