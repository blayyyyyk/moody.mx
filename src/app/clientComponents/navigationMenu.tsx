"use client"
import ThemeToggle from './themeToggle';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

function NavigationItem({ href, children, className = "" }: { href: string, children: ReactNode, className?: string }) {
    return (
        <Button className={`bg-secondary ${className}`} variant="default" asChild>
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
            <div className="flex min-w-0 bg-secondary md:contents">
                <NavigationItem href="#photos" className="min-w-0 flex-1 md:flex-none">Photos</NavigationItem>
                <div className="w-11 shrink-0 border-l border-primary md:w-auto md:border-0">
                    <ThemeToggle />
                </div>
            </div>
        </div>
    )
}
