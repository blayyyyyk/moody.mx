import { Button } from "@/components/ui/button";
import Heading from "./heading";
import Link from "next/link";

export const LINKS = {
    instagram: "https://www.instagram.com/blayyyyyk/",
    github: "https://github.com/blayyyyyk/",
    linkedin: "https://www.linkedin.com/in/blake-moody-2626ba11b/",
    email: "mailto:blake@mpsych.org",
}

export default function Links() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center z-10 relative">
            <div className="w-full font-bold h-auto text-5xl sm:text-[200px] flex justify-center absolute text-primary-50">
                <div className="w-auto h-auto font-bold">

                    <Heading className='font-semibold text-5xl sm:text-[200px] mix-blend-exclusion text-primary'>blake</Heading>
                    <div className='opacity-20 font-bold text-primary'>moody.mx</div>
                </div>
            </div>

            <div className="absolute bottom-10 sm:bottom-6 grid grid-cols-2 grid-rows-2 w-[250px] h-auto text-sm border border-primary">
                <Button className="border-r border-b border-primary" variant="link" asChild>
                    <Link href={LINKS.instagram}>Instagram</Link>
                </Button>
                <Button className="border-b border-primary" variant="link" asChild>
                    <Link href={LINKS.github}>Github</Link>
                </Button>
                <Button className="border-r border-primary" variant="link" asChild>
                    <Link href={LINKS.linkedin}>LinkedIn</Link>
                </Button>
                <Button className="" variant="link" asChild>
                    <Link href={LINKS.email}>Email</Link>
                </Button>
            </div>
            <div className='absolute top-6 right-6'>
            </div>
        </div>
    )
} 
