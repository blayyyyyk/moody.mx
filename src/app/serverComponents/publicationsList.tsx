import React from 'react';
import { getSheetFields, getSheetsData, reshapeSheet } from './timeline';
import Publications from '../clientComponents/publications';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Building2 as Building, SquareUser } from "lucide-react";

// =============================================================
// 1. TYPES & INTERFACES
// =============================================================

interface PublicationEntryI {
    Title: string;
    Authors: string;
    Link: string;
    Date?: string;
    Journal?: string;
    Abstract: string;
}


function PublicationEntry(publication: PublicationEntryI) {
    return (
        <div className="relative w-full h-full max-h-[50vh] overflow-y-clip flex flex-col">
            <div className="p-3">
                <div className="text-3xl mb-3">{publication["Title"]}</div>
                <PublicationTags publication={publication} />
                <p className="text-base hidden sm:block mt-3">{ publication["Abstract"] }</p>
            </div>
            <div className="flex flex-row w-full bg-secondary">
                <a className="absolute bottom-0 w-full bg-inherit flex-grow h-auto text-sm border-t-1 border-primary mt-auto text-center py-3 hover:bg-blue-500 hover:text-primary" href={publication["Link"]}>Read Abstract</a>
                <div className="">
                    <div></div>
                </div>
            </div>
        </div>
    )
}

function PublicationTags({ publication, className = "" }: { publication: PublicationEntryI, className?: string }) {
    return (
        <span className={`font-bold gap-2 flex flex-row flex-wrap ${className}`}>
            <Badge variant="outline" className={`border-primary font-medium inline-flex rounded-none my-0 items-center gap-3 text-primary ${className}`}>
                <Calendar className="stroke-primary w-auto h-full" />
                <p>{publication["Date"]}</p>
            </Badge>
            <Badge variant="outline" className={`border-primary font-medium rounded-none my-0 inline-flex items-center gap-3 text-primary ${className}`}>
                <Building className="stroke-primary w-auto h-full" />
                <p>{publication["Journal"]}</p>
            </Badge>
            <Badge variant="outline" className={`border-primary font-medium rounded-none my-0 inline-flex items-center gap-3 text-primary ${className}`}>
                <SquareUser className="stroke-primary w-auto h-full" />
                <p>{publication["Authors"]}</p>
            </Badge>
        </span>
    )
}

export default async function PublicationsList() {
    const articlesFields = await getSheetFields("Publications");
    const articles = await getSheetsData("Publications", "A2:F")
        .then(articles => reshapeSheet(articles, articlesFields)) as PublicationEntryI[];
    
    return (
        <Publications>
            {articles.length === 0 ? (
                <p className="text-primary/50 italic">No publications found.</p>
            ) : (
                articles.map((article, index) => (
                    <PublicationEntry key={index} {...article} />
                ))
            )}
        </Publications>
    );
}