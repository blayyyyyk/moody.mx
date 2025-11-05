"use client"
import { Fragment, ReactNode } from "react"
import { Program, Course } from "../../lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import DrawerTrigger from "./drawerTrigger";
import { Calendar, MapPin, Building2 as Building, SquareUser } from "lucide-react";

function CourseEvent({ course, index }: { course: Course, index: number}) {
    return (
        <div className="w-full h-full max-h-[33vh] relative overflow-hidden flex-col flex justify-between">
            <div className="flex flex-col gap-3 text-left p-3">
                <h1 className="text-3xl font-light text-left py-0 m-0">{course["Course Name"]}</h1>
                <EventTags course={course} className="font-medium text-[10px]" />
                <p className="my-0 -mt-1 text-wrap text-start">
                    {course["Description"]}
                </p>
            </div>
            <EventDrawer course={course} bottomBorder={index != 1}>
                <Calendar className="stroke-primary ml-3" width={12} height={12} />
                <div className="ml-3">{course["Start Date"]}</div>
            </EventDrawer>
        </div>
        
    )
}

function ProgramEvent({ program }: {program: Program}) {
    return (
        <div className="w-full h-full flex flex-col gap-3 text-left p-3 border-primary border-1">
            <h1 className="text-3xl font-light text-left py-0 m-0">{program["Program Name"]}</h1>
            <EventTags program={program} />
            <p className="my-0 -mt-1 text-wrap text-start">
                {program["Program Description"]}
            </p>
        </div>
    )
}

function CourseCarousel({ program }: { program: Program}) {
    return (
        <Carousel className="w-full h-auto max-h-full grid grid-cols-[auto_auto_auto] grid-rows-1 relative">
            <CarouselPrevious className='bg-secondary rounded-none h-auto stroke-primary border-primary m-0 relative left-0 right-0 mr-3' />
            <CarouselContent className="mx-[1px] h-full">
                {program["Events"].filter((course: Course, index: number) => index % 2 == 0).map((course: Course, index: number) =>
                    <CarouselItem key={`course-carousel-item-${index}`} className="lg:basis-1/2 xl:basis-1/3 p-0 border-1 not-first:border-l-0 border-primary">
                        <div className="w-full h-full grid grid-rows-2 grid-cols-1">
                            <CourseEvent course={course} index={0} />
                            {2 * index + 1 < program["Events"].length &&
                                <CourseEvent course={program["Events"][2 * index + 1]} index={1} />
                            }
                        </div>
                    </CarouselItem>
                )}
            </CarouselContent>
            <CarouselNext className='bg-secondary rounded-none h-auto flex stroke-primary border-primary m-0  relative left-0 right-0 ml-3' />
        </Carousel>
    )
}

function EventDrawer({children, bottomBorder, course, program}: {children: ReactNode[], bottomBorder: boolean, course?: Course, program?: Program}) {
    return (
        <div className="absolute bottom-0 w-full h-auto">
            
            <Drawer>
                <DrawerTrigger className={bottomBorder ? "border-b-1" : "border-b-0"} label="expand" />
                <EventDrawerContent course={course} program={program} />
            </Drawer>
        </div>
    )
}

function EventTags({ course, program, className }: { course?: Course, program?: Program, className?: string }) {
    return (
        <span className={`font-bold gap-2 flex flex-row flex-wrap ${className}`}>
            <Badge variant="outline" className={`border-primary font-medium inline-flex rounded-none my-0 items-center gap-3 text-primary ${className}`}>
                <Calendar className="stroke-primary w-auto h-full" />
                {course && course["Start Date"]}
                {program && `${program["Start"]} - ${program["End"]}`}
            </Badge>
            <Badge variant="outline" className={`border-primary font-medium rounded-none my-0 inline-flex items-center gap-3 text-primary ${className}`}>
                <MapPin className="stroke-primary w-auto h-full" />
                {course && course["Location"]}
                {program && program["Location"]}
            </Badge>
            {program &&
                <Badge variant="outline" className={`border-primary font-medium rounded-none my-0 inline-flex items-center gap-3 text-primary ${className}`}>
                    <Building className="stroke-primary w-auto h-full" />
                    {program["Organization"]}
                </Badge>
            }
            {course &&
                <Badge variant="outline" className={`border-primary font-medium rounded-none my-0 inline-flex items-center gap-3 text-primary ${className}`}>
                    <SquareUser className="stroke-primary w-auto h-full" />
                    {course["Professor"]}
                </Badge>
            }
        </span>
    )
}

function EventDrawerContent({ course, program }: { course?: Course, program?: Program }) {
    return (
        <DrawerContent style={{ borderRadius: "0px" }} className=" bg-secondary p-3 border-t-1 h-auto w-screen border-primary flex flex-col gap-3">
            <h1 className="text-primary m-0">{course && `${course["Course ID"]} - ${course["Course Name"]}`}{program && program["Program Name"]}</h1>
            <EventTags program={program} course={course} className="text-primary font-light text-[16px]" />
            <p className="text-primary md:text-lg">{course && course["Description"]}{program && program["Program Description"]}</p>
        </DrawerContent>
    )
}

function EventDrawerMobile({ course }: { course: Course}) {
    return (
        <Drawer>
            <DrawerTrigger className="border-b-0 justify-start p-3" label={course["Course Name"]} condenseForMobile={false} />
            <EventDrawerContent course={course} />
        </Drawer>
    )
}

export default function TimelineClient({ programs }: { programs: Program[]}) {
    console.log(programs);
    return (
        <div className="flex flex-col w-screen h-[max(auto,_100vh)">
            <Tabs defaultValue={programs.length > 0 ? programs[0]["Program Name"] : ""} className="w-full h-auto p-3 m-0 flex flex-col md:flex-row gap-3">
                <TabsList className="flex flex-col w-full md:max-w-[400px] h-full items-start  m-0 p-0 gap-0 border-b-1 border-primary rounded-none bg-secondary">
                    {programs.map((program: Program, index: number) =>
                        <Fragment key={`fragment-${index}`}>
                            <TabsTrigger key={`program-tabs-trigger-${index}`} style={{ flexGrow: "0" }} className="m-0 p-0 border-0 w-full justify-start h-[100px]" key={`tabs-trigger-timeline-${index}`} value={program["Program Name"]}>
                                <div className="flex flex-row w-full justify-between items-center p-3 relative border-t-1 border-l-1 border-r-1 border-primary hover:text-secondary hover:bg-primary">
                                    <div className="w-auto">
                                        {program["Program Name"]}
                                    </div>
                                </div>
                            </TabsTrigger>
                            {
                                program["Events"].length > 0 &&
                                <TabsContent key={`tabs-content-${index}`} className="hidden md:block flex-grow relative border-1 border-b-0 border-primary" value={program["Program Name"]}>
                                    <div className="w-full h-auto max-h-full overflow-y-clip relative p-3">

                                        <div className="p-0 text-wrap h-auto max-h-full text-left text-primary">
                                            {program["Program Description"]}
                                        </div>
                                    </div>
                                    <EventDrawer program={program} bottomBorder={false}>
                                        <Calendar className="stroke-primary ml-3" width={12} height={12} />
                                        <div className="ml-3">{program["Start"]}-{program["End"]}</div>
                                    </EventDrawer>
                                </TabsContent>
                            }
                            <TabsContent key={`tabs-content-${index}-alt`} className="block md:hidden flex-grow relative border-1 border-b-0 border-primary" value={program["Program Name"]}>
                                <div className="w-full h-auto max-h-full overflow-y-clip relative p-3 flex flex-col gap-3">
                                    <div className="p-0 text-wrap h-auto max-h-full text-left text-primary pb-3">
                                        {program["Program Description"]}
                                    </div>
                                    <EventTags program={program} className="font-medium text-[10px]" />
                                </div>
                                {
                                    program["Events"].map((course: Course, index: number) => 
                                        <EventDrawerMobile key={`event-drawer-mobile-${index}`} course={course} />
                                    )
                                }
                            </TabsContent>
                        </Fragment>
                    )}
                </TabsList>
                {programs.map((program: Program, index: number) =>
                    <TabsContent className="hidden md:block" key={index} value={program["Program Name"]}>
                        {
                            program["Events"].length > 0 &&
                            <CourseCarousel key={`course-carousel-${index}`} program={program} />
                        }
                        {
                            program["Events"].length == 0 &&
                            <ProgramEvent key={`program-event-${index}`} program={program} />
                        }
                    </TabsContent>
                )}
            </Tabs>
            <div className="flex-grow w-full">

            </div>
        </div>
    )
}