import Breakline from "@/common/components/elements/Breakline";

import ProjectPreview from "./ProjectPreview";
import Introduction from "./Introduction";
import Services from "./Services";
import SkillsSection from "./SkillsSection";

const Home = () => {
  return (
    <>
      <Introduction />
      <Breakline className="mb-7 mt-8" />
      <ProjectPreview />
      <Breakline className="my-8" />
      <SkillsSection />
      <Breakline className="my-8" />
      <Services />
    </>
  );
};

export default Home;
