import {
  HiOutlineAcademicCap as EducationIcon,
  HiOutlineBookmark as AboutIcon,
  HiOutlineBriefcase as CareerIcon,
  HiOutlineDocumentText as ResumeIcon,
  HiOutlineClock as TimelineIcon,
} from "react-icons/hi";

import { Tabs } from "@/common/components/elements/Tabs";

import CareerList from "./CareerList";
import EducationList from "./EducationList";
import Resume from "./Resume";
import Story from "./Story";
import CareerTimeLine from "./CareerTimeLine";
import type { TimelineItem } from "./CareerTimeLine";
import { CAREERS } from "@/common/constant/careers";
import { formatDate } from "@/common/helpers";

const TIMELINE_ITEMS: TimelineItem[] = CAREERS.map((c) => {
  const start = formatDate(c.start_date, "MMM yyyy");
  const end = c.end_date ? formatDate(c.end_date, "MMM yyyy") : "Present";
  return {
    date: `${start} — ${end}`,
    title: `${c.company} · ${c.position}`,
    description:
      c.responsibilities?.[0] ||
      `${c.type} • ${c.location_type} • ${c.location}`,
  };
});

const About = () => {
  const TABS = [
    {
      label: (
        <TabLabel>
          <AboutIcon size={17} /> 소개
        </TabLabel>
      ),
      children: <Story />,
    },
    {
      label: (
        <TabLabel>
          <CareerIcon size={17} /> 경력사항
        </TabLabel>
      ),
      children: <CareerList />,
    },
    {
      label: (
        <TabLabel>
          <TimelineIcon size={17} /> 타임라인
        </TabLabel>
      ),
      children: <CareerTimeLine items={TIMELINE_ITEMS} />,
    },
    {
      label: (
        <TabLabel>
          <ResumeIcon size={17} /> 이력서
        </TabLabel>
      ),
      children: <Resume />,
    },
    {
      label: (
        <TabLabel>
          <EducationIcon size={17} /> 교육
        </TabLabel>
      ),
      children: <EducationList />,
    },
  ];
  return <Tabs tabs={TABS} />;
};

export default About;

const TabLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-center gap-1.5">{children}</div>
);
