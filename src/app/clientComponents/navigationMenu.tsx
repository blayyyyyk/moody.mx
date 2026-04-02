"use client"
import {
    NavigationMenu as NavigationMenuGeneric,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

import ThemeToggle from './themeToggle';
import { useEffect, useRef } from "react";
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
    const isMounted = useRef<boolean>(false);
    const navRef = useRef<HTMLDivElement>(null!);

    useEffect(() => {
        if (isMounted.current) return;

        

        document.addEventListener("scroll", (event) => {
            if (window.scrollY > 30) {
                navRef.current.style.opacity = "100%";
                navRef.current.style.display = "flex";
                return
            }

            navRef.current.style.opacity = "0%";
            navRef.current.style.display = "none";

        });
        isMounted.current = true;
    }, [])

    return (
        <div className="w-screen h-auto sticky top-0 bg-primary grid grid-cols-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_100px] border-y border-primary z-20 gap-px">
            <NavigationItem href="#about">About</NavigationItem>
            <NavigationItem href="#timeline">Timeline</NavigationItem>
            <NavigationItem href="#publications">Publications</NavigationItem>
            <NavigationItem href="#projects">Projects</NavigationItem>
            <NavigationItem href="#photos">Photos</NavigationItem>
            <div className="bg-secondary">
                <ThemeToggle />
            </div>
        </div>
    )
}