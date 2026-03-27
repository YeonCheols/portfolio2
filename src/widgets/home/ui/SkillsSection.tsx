import Skills from "@/features/about/ui/Skills";
import SectionHeading from "@/shared/ui/SectionHeading";

const SkillsSection = () => {
  return (
    <section className="space-y-5">
      <div className="space-y-3">
        <SectionHeading title="기술 스택" />
      </div>
      <Skills />
    </section>
  );
};

export default SkillsSection;
