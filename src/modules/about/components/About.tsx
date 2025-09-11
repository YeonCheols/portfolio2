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
import type { TimelineItem } from "@/common/types/careers";
import { CAREERS } from "@/common/constant/careers";
import { TabProps } from "@/common/types/tab";

const TabLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-center gap-1.5">{children}</div>
);

const TIMELINE_ITEMS: TimelineItem[] = CAREERS.map((c) => {
  return {
    date: `${c.start_date} — ${c.end_date}`,
    title: c.company,
    ...(c.responsibilities
      ? {
          description: (
            <>
              {c.responsibilities.map((text, idx) => (
                <>
                  <span key={idx}>{text}</span>
                  {idx < (c.responsibilities?.length ?? 0) - 1 && <br />}
                </>
              ))}
            </>
          ),
        }
      : { description: <></> }),
    ...(c.link ? { link: c.link } : {}),
  };
});

const TABS: TabProps[] = [
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
        <TimelineIcon size={17} /> 타임라인
      </TabLabel>
    ),
    children: <CareerTimeLine items={TIMELINE_ITEMS} />,
    isActive: true,
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

const About = () => {
  return <Tabs tabs={TABS} />;
};

export default About;
