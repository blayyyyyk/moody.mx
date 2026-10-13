"use client"
import ThemeToggle from './themeToggle';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

function NavigationItem({ href, children, className = "" }: { href: string, children: ReactNode, className?: string }) {
    return (
        <Button className={`bg-secondary px-1 text-[10px] sm:text-xs lg:text-sm ${className}`} variant="default" asChild>
            <Link href={href}>{ children }</Link>
        </Button>
    )
}

export default function NavigationMenu() {
    return (
        <div className="w-screen h-auto sticky top-0 bg-primary grid grid-cols-4 md:grid-cols-[repeat(7,minmax(0,1fr))_64px] border-y border-primary z-20 gap-px">
            <NavigationItem href="#about">About</NavigationItem>
            <NavigationItem href="#timeline">Timeline</NavigationItem>
            <NavigationItem href="#publications">Publications</NavigationItem>
            <NavigationItem href="#projects">Projects</NavigationItem>
            <NavigationItem href="#music">Music</NavigationItem>
            <NavigationItem href="#manga-anime">Manga/Anime</NavigationItem>
            <NavigationItem href="#photos">Photos</NavigationItem>
            <ThemeToggle />
        </div>
    )
}
