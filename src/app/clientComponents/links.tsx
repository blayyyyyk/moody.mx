"use client"
import { Button } from "@/components/ui/button";
import Heading from "./heading";
import Link from "next/link";
import { LINKS } from "../constants";
import { useTheme } from "next-themes";

export default function Links() {
    const { theme, setTheme } = useTheme();
    
    const handleToggle = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };
    
    return (
        <div className="w-full h-full flex flex-col items-center justify-center z-10 relative">
            <div className="w-full font-bold h-auto text-5xl sm:text-[200px] flex justify-center absolute text-primary-50">
                <div className="w-auto h-auto font-bold">

                    <Heading className='font-semibold text-5xl sm:text-[200px] mix-blend-exclusion text-primary'>blake</Heading>
                    <div className='opacity-20 font-bold text-primary'>moody.mx</div>
                </div>
            </div>
            
            <div className="absolute bottom-10 sm:bottom-6 flex flex-col items-center gap-1">
                <Button onClick={handleToggle} className="border-primary w-auto h-auto font-extralight text-[10px] border py-1">
                    - Toggle Theme -
                </Button>
                <div className=" grid grid-cols-2 grid-rows-2 w-[250px] h-auto text-sm border border-primary">
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
            </div>

            <div className='absolute top-6 right-6'>
            </div>
        </div>
    )
} 
