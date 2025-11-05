import Heading from '../clientComponents/heading';
import { Inter } from "next/font/google";
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkBreaks from 'remark-breaks';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex'
import ReactMarkdown from "react-markdown";
import plusJakartaSans from '../../../styles/fonts';
import 'highlight.js/styles/github-dark.css';
import { Project } from '@/lib/types';
import { Octokit } from "@octokit/rest";
import Image from 'next/image';
import DrawerTrigger from '../clientComponents/drawerTrigger';
import { getProjects } from '@/lib/github';

const inter = Inter({ subsets: ["latin"] });

import { Badge } from "@/components/ui/badge"
import Carousel from '../clientComponents/carousel';

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerTitle,
    DrawerTrigger as GenericDrawerTrigger,
} from "@/components/ui/drawer"

import { ProjectExpandedView, ProjectMiniView } from '../clientComponents/projectEntry';

interface ProjectEntry {
    date: string;
    title: string;
    desc: string;
    href: string;
    location: string;
    tags: string[];
    commitAPIUrl?: string;
}

export default async function FeaturedProjects() {
    const projects = await getProjects();

    return (
        <Carousel heading="Projects">
            {projects.map((project: any, idx: number) => (
                <Drawer key={idx}>
                    <ProjectMiniView project={project} />
                    <ProjectExpandedView project={project} />
                </Drawer>
            ))}
        </Carousel>
    );
}