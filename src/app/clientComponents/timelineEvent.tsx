"use client";
import { Dispatch, Fragment, ReactNode, SetStateAction, useState } from "react";
import { Program, Course } from "../../lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Carousel, CarouselItem } from "./emblaCarousel";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { DrawerTrigger } from "./drawerTrigger";
import {
    Calendar,
    MapPin,
    Building2 as Building,
    SquareUser,
} from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
} from "@/components/ui/accordion";

import { AccordionTrigger } from "./drawerTrigger";
import HeavenlyMesh from "./heavenlyMesh";
import { CourseEntry } from "./project";

function CourseEvent({ course, index }: { course: Course; index: number }) {
    return (
        <div className="w-full h-full max-h-[33vh] relative overflow-hidden flex-col flex justify-between">
            <div className="flex flex-col gap-3 text-left p-3">
                <h1 className="text-3xl font-light text-left py-0 m-0">
                    {course["Course Name"]}
                </h1>
                <EventTags
                    course={course}
                    className="font-medium text-[10px]"
                />
                <p className="my-0 -mt-1 text-wrap text-start">
                    {course["Description"]}
                </p>
            </div>
            <EventDrawer course={course} bottomBorder={index != 1}>
                <Calendar
                    className="stroke-primary ml-3"
                    width={12}
                    height={12}
                />
                <div className="ml-3">{course["Start Date"]}</div>
            </EventDrawer>
        </div>
    );
}

function ProgramEvent({ program }: { program: Program }) {
    return (
        <div className="w-full h-full flex flex-col gap-3 text-left p-3 border-primary border-1">
            <h1 className="text-3xl font-light text-left py-0 m-0">
                {program["Program Name"]}
            </h1>
            <EventTags program={program} />
            <p className="my-0 -mt-1 text-wrap text-start">
                {program["Program Description"]}
            </p>
        </div>
    );
}

function CourseCarousel({ program }: { program: Program }) {
    const courseGroupIds = Array.from({
        length: Math.ceil(program["Events"].length / 6),
    });

    return (
        <Carousel className="grid grid-rows-2 grid-flow-col auto-cols-[calc(33%_-_6px))]  h-[50vh] gap-3">
            {program["Events"].map((course: Course, index: number) => (
                <CarouselItem key={index}>
                    <CourseEntry
                        className="bg-transparent rounded-none m-0 flex flex-col relative"
                        program={program}
                        course={course}
                    />
                </CarouselItem>
            ))}
        </Carousel>
    );
}

function EventDrawer({
    children,
    bottomBorder,
    course,
    program,
}: {
    children: ReactNode[];
    bottomBorder: boolean;
    course?: Course;
    program?: Program;
}) {
    return (
        <div className="absolute bottom-0 w-full h-auto">
            <Drawer>
                <DrawerTrigger
                    className={bottomBorder ? "border-b-1" : "border-b-0"}
                    label="expand"
                />
                <EventDrawerContent course={course} program={program} />
            </Drawer>
        </div>
    );
}

function EventTags({
    course,
    program,
    className,
}: {
    course?: Course;
    program?: Program;
    className?: string;
}) {
    return (
        <span
            className={`font-bold gap-2 flex flex-row flex-wrap ${className}`}
        >
            <Badge
                variant="outline"
                className={`border-primary font-medium inline-flex rounded-none my-0 items-center gap-3 text-primary ${className}`}
            >
                <Calendar className="stroke-primary w-auto h-full" />
                {course && course["Start Date"]}
                {program && `${program["Start"]} - ${program["End"]}`}
            </Badge>
            <Badge
                variant="outline"
                className={`border-primary font-medium rounded-none my-0 inline-flex items-center gap-3 text-primary ${className}`}
            >
                <MapPin className="stroke-primary w-auto h-full" />
                {course && course["Location"]}
                {program && program["Location"]}
            </Badge>
            {program && (
                <Badge
                    variant="outline"
                    className={`border-primary font-medium rounded-none my-0 inline-flex items-center gap-3 text-primary ${className}`}
                >
                    <Building className="stroke-primary w-auto h-full" />
                    {program["Organization"]}
                </Badge>
            )}
            {course && (
                <Badge
                    variant="outline"
                    className={`border-primary font-medium rounded-none my-0 inline-flex items-center gap-3 text-primary ${className}`}
                >
                    <SquareUser className="stroke-primary w-auto h-full" />
                    {course["Professor"]}
                </Badge>
            )}
        </span>
    );
}

function EventDrawerContent({
    course,
    program,
}: {
    course?: Course;
    program?: Program;
}) {
    return (
        <DrawerContent
            style={{ borderRadius: "0px" }}
            className=" bg-secondary p-3 border-t-1 h-auto w-screen border-primary flex flex-col gap-3"
        >
            <h1 className="text-primary m-0">
                {course && `${course["Course ID"]} - ${course["Course Name"]}`}
                {program && program["Program Name"]}
            </h1>
            <EventTags
                program={program}
                course={course}
                className="text-primary font-light text-[16px]"
            />
            <p className="text-primary md:text-lg">
                {course && course["Description"]}
                {program && program["Program Description"]}
            </p>
        </DrawerContent>
    );
}

function EventDrawerMobile({ course }: { course: Course }) {
    return (
        <Drawer>
            <DrawerTrigger
                className="border-b-0 justify-start p-3"
                label={course["Course Name"]}
                condenseForMobile={false}
            />
            <EventDrawerContent course={course} />
        </Drawer>
    );
}

function TimelineAccordion({
    programs,
    focusedId,
    setFocusedId,
    children
}: {
    programs: Program[];
    focusedId: number;
        setFocusedId: Dispatch<SetStateAction<number>>;
        children: React.ReactNode;
}) {
    return (
        <Accordion
            type="single"
            collapsible
            defaultValue={programs[0]["Program Name"]}
        >
            {programs.map((p: Program, i: number) => (
                <AccordionItem
                    value={p["Program Name"]}
                    key={i}
                    className="border-0 not-last:border-b-1 border-primary"
                    onClick={() => setFocusedId(i)}
                >
                    <AccordionTrigger
                        condenseForMobile={false}
                        label={p["Program Name"]}
                        className="border-0 m-0"
                    ></AccordionTrigger>
                    <AccordionContent className="px-3 flex flex-col gap-3">
                        <p className="text-sm">{p["Program Description"]}</p>
                        { children }
                    </AccordionContent>
                    
                </AccordionItem>
            ))}
        </Accordion>
    );
}

export default function TimelineClient({ programs }: { programs: Program[] }) {
    const [focusedId, setFocusedId] = useState<number>(0);
    const [meshFocused, setMeshFocused] = useState<boolean>(false);

    const MobileCarousel = () => {
        return (
            <>
                {programs[focusedId]["Events"].length > 0 && <Carousel className="grid grid-rows-1 md:grid-rows-2 grid-flow-col auto-cols-[100%] sm:auto-cols-[50%] lg:auto-cols-[calc(33%_+_2px))] h-full">
                    {programs[focusedId]["Events"].map((course: Course, index: number) => (
                        <CarouselItem key={index}>
                            <CourseEntry
                                className="bg-transparent rounded-none m-0 relative h-full flex flex-col border-0"
                                program={programs[focusedId]}
                                course={course}
                            />
                        </CarouselItem>
                    ))}
                </Carousel>}
            </>
        )
    }
    
    return (
        <div className="relative grid grid-cols-1 grid-rows-[auto_auto_1fr] md:grid-cols-3 md:grid-rows-[80vh_20vh] w-full md:h-auto gap-3 p-3">
            <div className="w-full h-full border-1 border-primary row-span-1 md:row-span-2">
                <TimelineAccordion programs={programs} focusedId={focusedId} setFocusedId={setFocusedId}>
                    <div className="flex md:hidden h-full"><MobileCarousel /></div>
                </TimelineAccordion>
            </div>
            <div className="col-span-1 row-span-1 md:col-span-2">
                <div className="hidden md:flex h-full"><MobileCarousel /></div>
            </div>
            <div
                className="w-full h-auto col-span-1 md:col-span-2 border-1 border-primary z-0 md:z-20"
                onMouseEnter={() => setMeshFocused(true)}
                onMouseLeave={() => setMeshFocused(false)}
            >
                <HeavenlyMesh
                    meshPath="/RTX_3080_FE.stl"
                    focus={meshFocused}
                    scale={3}
                />
            </div>
        </div>
    );
}
