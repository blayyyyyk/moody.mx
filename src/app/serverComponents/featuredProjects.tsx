import Heading from "../clientComponents/heading";
import ProjectsExplorer from "../clientComponents/projectsExplorer";
import { getProjectsData } from "@/lib/github";

export default async function FeaturedProjects() {
  const data = await getProjectsData();
  return (
    <section aria-label="Projects" className="scroll-mt-24 md:scroll-mt-12">
      <Heading className="mx-3 border-primary border-1 p-3 text-wrap scroll-mt-24 md:scroll-mt-12">Projects</Heading>
      <ProjectsExplorer data={data} />
    </section>
  );
}
