import Carousel from "../clientComponents/carousel";
import PhotoEntry, { CameraMesh } from "../clientComponents/photoEntry";
import { PhotosResponse, Photo, ImageMediaMetadata } from "@/lib/types";
import { ApertureFrame } from "../clientComponents/photography";
import { Aperture, Calendar, Camera, Focus, Timer } from "lucide-react";
import Heading from "../clientComponents/heading";
import HeavenlyMesh from "../clientComponents/heavenlyMesh";


const apiKey = process.env.NEXT_PUBLIC_GCP_API_KEY; // Use your environment variable for the Google API key

export async function fetchDrivePhotos(folderId: string) {
    const myHeaders = new Headers();
    myHeaders.append("Accept", "application/json");

    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
        cache: "no-store"
    };
    
    // @ts-ignore
    const response = await fetch(`https://www.googleapis.com/drive/v2/files?q='${folderId}' in parents&key=${apiKey}`, requestOptions);
    const result: PhotosResponse = await response.json();
    const photos = result.items;
    return photos
}


export default async function Photobook() {
    const folderId = process.env.NEXT_PUBLIC_SHARED_FOLDER_ID; // Retrieve the folder ID from the query parameter
    const photos = folderId ? await fetchDrivePhotos(folderId) : [];
    
    return (
        <div className="w-full px-3">
            <Heading className="border-primary border-1 p-3 text-wrap mb-3">
                Photos
            </Heading>
            <div id="photos" className="relative grid grid-cols-3 max-sm:bg-primary max-sm:border max-sm:border-primary gap-px sm:gap-3 w-full h-auto z-10 grid-rows-[repeat(10,calc(15vh_*_(3_/_4)))] sm:grid-rows-[repeat(10,calc(30vh_*_(3_/_4)))] md:grid-rows-[repeat(10,calc(50vh_*_(3_/_4)))]">
                {photos && photos.map((photo: Photo, index: number) => {
                    return (
                        <div className={`relative w-full h-full ${index % 6 == 0 || index == 4 ? "col-span-2 row-span-2" : ""}`} key={index}>
                            <PhotoEntry key={index} photo={photo} />
                        </div>
                    )
                })}
                
            </div>
        </div>
    )
}