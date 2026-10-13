"use client"
import ThemeToggle from './themeToggle';
import Link from "next/link";
import { Button } from "@/components/ui/button";

function NavigationItem({ href, children }: { href: string, children: any }) {
    return (
        <Button className="bg-secondary" variant="default" asChild>
            <Link href={href}>{ children }</Link>
        </Button>
    )
}

export default function NavigationMenu() {
    return (
        <div className="w-screen h-auto sticky top-0 bg-primary grid grid-cols-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_100px] border-y border-primary z-20 gap-px">
            <NavigationItem href="#about">About</NavigationItem>
            <NavigationItem href="#timeline">Timeline</NavigationItem>
            <NavigationItem href="#publications">Publications</NavigationItem>
            <NavigationItem href="#projects">Projects</NavigationItem>
            <NavigationItem href="#music">Music</NavigationItem>
            <NavigationItem href="#photos">Photos</NavigationItem>
            <div className="bg-secondary col-span-3 md:col-span-1">
                <ThemeToggle />
            </div>
        </div>
    )
}
