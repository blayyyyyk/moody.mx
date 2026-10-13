import "../../styles/Home.module.css";
import plusJakartaSans from "../../styles/fonts";
import Profile from "./clientComponents/splash";
import Timeline from "./serverComponents/timeline";
import Photobook from "./serverComponents/photobook";
import Projects from "./serverComponents/featuredProjects";
import Statement from "./clientComponents/statement";
import Publications from "./clientComponents/publications";
import PublicationsList from "./serverComponents/publicationsList";
import AboutMe from "./clientComponents/about";
import NavigationMenu from "./clientComponents/navigationMenu";
import Footer from "./clientComponents/footer";
import Music from "./clientComponents/music";
import { Suspense } from "react";
import Heading from "./clientComponents/heading";
import MangaAnime from "./clientComponents/mangaAnime";

function SectionLoading({ title }: { title: string }) {
    return <div className="mx-3 mb-3" aria-busy="true">
        <Heading className="border border-primary p-3">{title}</Heading>
        <div className="mt-3 min-h-[50vh] border border-primary p-3 text-sm text-muted-foreground" role="status">Loading {title.toLowerCase()}…</div>
    </div>;
}

export default function Home() {
    return (
        <div
            className={`w-full overflow-y-visible bg-secondary overflow-x-clip text-primary z-0 font-mono relative`}
        >
            <Profile />
            <NavigationMenu />
            <AboutMe />
            <Suspense fallback={<SectionLoading title="Publications" />}><PublicationsList /></Suspense>
            <Suspense fallback={<SectionLoading title="Timeline" />}><Timeline /></Suspense>
            <Suspense fallback={<SectionLoading title="Projects" />}><Projects /></Suspense>
            <Music />
            <MangaAnime />
            <Suspense fallback={<SectionLoading title="Photos" />}><Photobook /></Suspense>
            <Footer />
        </div>
    );
}
