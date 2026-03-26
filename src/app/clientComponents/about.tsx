import Image from "next/image";
import Heading from "./heading";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LINKS } from "./links";

const PROFILE_IMAGE = "/profile-cropped.jpg"

const imageStyle: React.CSSProperties = {
    objectFit: "cover"
}

export default function AboutMe() {
    return (
        <div className="w-full px-3 flex flex-col gap-3 mt-3">
            <Heading className="border-primary border-1 p-3 text-wrap">About</Heading>
            <div className="flex flex-col-reverse justify-end h-auto w-full md:flex-row md:h-[50vh] md:justify-start gap-3 mb-3">
                <div className="relative flex flex-col w-full h-auto md:h-full border border-primary overflow-y-auto">
                    <CardHeader className="overflow-clip hover:flex-grow transition-all">
                        <CardTitle>Overview</CardTitle>
                        <CardDescription>I build web-native machine learning systems and research tooling for spatial reasoning, embodied agents, and geometric representations — with a bias toward fast, reproducible experiments and clean system design.</CardDescription>
                    </CardHeader>
                    <Separator className="bg-primary" />
                    <CardHeader className="overflow-clip hover:flex-grow transition-all">
                        <CardTitle>Background</CardTitle>
                        <CardDescription className="max-h-full overflow-y-auto">I am currently an undergraduate in computer science, study at the University of Massachusetts Boston. I am also an undergraduate researcher at Machine Psychology, a lab that combines biomedical technology with artificial intelligence.</CardDescription>
                    </CardHeader>
                    <Separator className="bg-primary" />
                    <CardHeader className="overflow-clip hover:flex-grow transition-all">
                        <CardTitle>Hobbies</CardTitle>
                        <CardDescription>In my spare time I practice photography with my Sony A7 iii, collect manga and vinyl records, sketch pictures of my dog, and teach myself Japanese. I enjoy travelling to other countries and playing video games.</CardDescription>
                    </CardHeader>
                    <div className="grid grid-cols-3 sticky lg:relative flex-row border-t border-primary mt-auto bottom-0 w-full">
                        <Button variant="link" className="border-r border-primary" asChild>
                            <Link href={LINKS.instagram}>Instagram</Link>
                        </Button>
                        <Button variant="link" className="border-r border-primary" asChild>
                            <Link href={LINKS.github}>Github</Link>
                        </Button>
                        <Button variant="link" asChild>
                            <Link href={LINKS.linkedin}>LinkedIn</Link>
                        </Button>
                    </div>
                </div>
                <div className="w-full h-1/2 min-h-[50vh] md:h-full relative border border-primary">
                    <Image src={PROFILE_IMAGE} alt={PROFILE_IMAGE} style={imageStyle}
                        fill />
                    <div className="w-full p-2 absolute top-0 text-center bg-secondary border-b border-primary shadow-lg">
                        Photo taken by Kendal Brosnan
                    </div>
                </div>
            </div>
        </div>
    )
}