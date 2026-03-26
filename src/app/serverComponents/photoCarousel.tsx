import { Button } from "@/components/ui/button";
import { Carousel, CarouselItem } from "../clientComponents/emblaCarousel";
import { fetchDrivePhotos } from "./photobook";
import Image from "next/image";
import { Photo } from "@/lib/types";

export default async function PhotoCarousel() {
    const folderId = process.env.NEXT_PUBLIC_SHARED_FOLDER_ID; // Retrieve the folder ID from the query parameter
    const photos = folderId ? await fetchDrivePhotos(folderId) : [];

    return (
        <Carousel>
            {photos.map((photo: Photo, index: number) => (
                <CarouselItem key={index}>
                    <div
                        // aspect-video maintains shape, w-full fills the auto-col width
                        className="relative w-full aspect-[4/3] overflow-hidden"
                    >
                        <Image
                            src={photo.webContentLink}
                            alt={`photobook-${index}`}
                            fill
                            className="object-cover"
                            priority={index < 4} // Load the first 4 instantly
                            sizes="(max-width: 768px) 100%"
                        />
                    </div>
                    <Button
                        variant="default"
                        className="w-full border-t-1 border-primary"
                    >
                        view photo details
                    </Button>
                </CarouselItem>
            ))}
        </Carousel>
    );
}
