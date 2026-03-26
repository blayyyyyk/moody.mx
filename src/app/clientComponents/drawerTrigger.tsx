import { DrawerTrigger as GenericDrawerTrigger } from "@/components/ui/drawer";

import { AccordionTrigger as GenericAccordionTrigger } from "@/components/ui/accordion";

import { Expand } from "lucide-react";

interface TriggerI {
    label?: string;
    className?: string;
    condenseForMobile?: boolean;
}

export function DrawerTrigger({
    label,
    className,
    condenseForMobile = true,
}: TriggerI) {
    return (
        <GenericDrawerTrigger
            className={`group w-full py-3 border-primary bg-secondary border-t-1 flex flex-row justify-center items-center hover:bg-primary gap-3 ${className}`}
        >
            <Expand className="w-4 h-4 stroke-primary group-hover:stroke-secondary group-hover:scale-130 group-hover:stroke-2 transition-all" />
            <span
                className={`text-xs md:text-sm font-light text-primary group-hover:text-secondary ${condenseForMobile == true ? "hidden md:block" : ""}`}
            >
                {label}
            </span>
        </GenericDrawerTrigger>
    );
}

export function AccordionTrigger({
    label,
    className,
    condenseForMobile = true,
}: TriggerI) {
    return (
        <GenericAccordionTrigger
            className={`group w-full py-3 border-primary bg-secondary border-t-1 flex flex-row p-3 justify-start md:justify-center items-center hover:bg-primary gap-3 ${className}`}
        >
            <Expand className="w-4 h-4 stroke-primary group-hover:stroke-secondary group-hover:scale-130 group-hover:stroke-2 transition-all" />
            <span
                className={`text-xs md:text-sm font-light text-primary group-hover:text-secondary ${condenseForMobile == true ? "hidden md:block" : ""}`}
            >
                {label}
            </span>
        </GenericAccordionTrigger>
    );
}
