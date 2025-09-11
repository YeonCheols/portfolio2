import SectionHeading from "@/common/components/elements/SectionHeading";
import CareerTimeLine from "@/modules/about/components/CareerTimeLine";
import type { TimelineItem } from "@/common/types/careers";
import { CAREERS } from "@/common/constant/careers";

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

const CareerTimelineSection = () => {
  return (
    <section className="space-y-5">
      <div className="space-y-3">
        <SectionHeading title="타임라인" />
      </div>
      <CareerTimeLine items={TIMELINE_ITEMS} hideHeader compact />
    </section>
  );
};

export default CareerTimelineSection;
