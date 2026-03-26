"use client";

import React from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { Photo } from "@/lib/types";
import { ArrowLeftIcon, ArrowRightIcon, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CarouselItemProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
    children: React.ReactNode;
}

export const CarouselItem: React.FC<CarouselItemProps> = ({
    className = "border border-primary",
    children,
    ...props
}) => {
    return (
        <div className={className} {...props}>
            {children}
        </div>
    );
}

interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
    children: React.ReactNode;
}

export const Carousel: React.FC<CarouselProps> = ({
    className = "grid grid-rows-1 grid-flow-col auto-cols-[100%] gap-4",
    children,
    ...props
}) => {
    // Initialize Embla
    const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

    return (
        <div className="relative w-auto grid grid-rows-1 grid-cols-[auto_1fr_auto] gap-3 h-full">
            <Button variant="outline" className="h-full w-6" onClick={() => emblaApi?.scrollPrev()}>
                <ArrowLeftIcon />
            </Button>
            <div
                className="overflow-hidden shadow-lg hover:border-x-1 border-primary"
                ref={emblaRef}
            >
                <div className={className} { ...props }>
                    {children}
                </div>
            </div>
            <Button variant="outline" className="h-full w-6 my-auto" onClick={() => emblaApi?.scrollNext()}>
                <ArrowRightIcon />
            </Button>
        </div>
    );
};
