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

export default function Home() {
    return (
        <div
            className={`w-full overflow-y-visible bg-secondary overflow-x-clip text-primary z-0 font-mono relative`}
        >
            <Profile />
            <NavigationMenu />
            <AboutMe />
            <PublicationsList />
            <Timeline />
            <Projects />
            <Photobook />
            <Footer />
        </div>
    );
}
