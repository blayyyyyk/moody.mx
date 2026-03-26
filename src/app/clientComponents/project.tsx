import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Building, Calendar, Expand, MapPin, SquareUser } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Course, Program } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

const desc =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

interface EntryProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    date?: string;
    location?: string;
    building?: string;
    people?: string[];
    className?: string;
    children?: React.ReactNode;
}

export const Entry: React.FC<EntryProps> = ({
    title = "Empty Entry Title",
    date = "Empty Date",
    location = "Empty Location",
    building = "Empty Building",
    people = ["Person 1", "Person 2", "Person 3"],
    className = "bg-transparent rounded-none m-0",
    children,
    ...props
}) => {
    return (
        <Card className={className} {...props}>
            <CardHeader className="p-3 gap-3 m-0 flex-shrink-0">
                <CardTitle className="font-light">{title}</CardTitle>
                <CardDescription className="flex flex-wrap gap-1 m-0">
                    {people.map((person: string, index: number) => (
                        <Badge key={index} variant="outline">
                            <SquareUser data-icon="inline-start" />
                            {person}
                        </Badge>
                    ))}
                    {location && (
                        <Badge>
                            <MapPin data-icon="inline-start" />
                            {location}
                        </Badge>
                    )}
                    {building && (
                        <Badge>
                            <Building data-icon="inline-start" />
                            {building}
                        </Badge>
                    )}
                    {date && (
                        <Badge>
                            <Calendar data-icon="inline-start" />
                            {date}
                        </Badge>
                    )}
                </CardDescription>
            </CardHeader>
            {children && children}
        </Card>
    );
};

interface CourseProps extends React.HTMLAttributes<HTMLDivElement> {
    course: Course;
    program: Program;
    className?: string;
}

export const CourseEntry: React.FC<CourseProps & EntryProps> = ({
    course,
    program,
    className= "bg-transparent rounded-none m-0",
}) => {
    return (
        <Entry className={className} title={course["Course Name"]} date={course["Start Date"]} location={program["Location"]} building={course["Location"]} people={[course["Professor"]]} >
            <ScrollArea className="h-auto flex-shrink-1 w-full">
                <CardContent className="p-3 text-[12px]">
                    { course["Description"] }
                </CardContent>
            </ScrollArea>
            <CardFooter className="absolute bottom-0 p-0 w-full">
                <Dialog>
                    <Button className="w-full h-auto mb-0 border-0 border-t-1 border-primary hover:border-secondary" asChild>
                        <DialogTrigger>
                            <Expand data-icon="inline-start" />
                            read course info
                        </DialogTrigger>
                    </Button>
                    <DialogContent className="bg-secondary rounded-none border border-primary">
                        <Entry className={className} title={course["Course Name"]} date={course["Start Date"]} location={program["Location"]} building={course["Location"]} people={[course["Professor"]]} />
                        <ScrollArea className="h-auto flex-shrink-1 w-full">
                            <CardContent className="p-3 text-base">
                                { course["Description"] }
                            </CardContent>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Entry>
    );
};
