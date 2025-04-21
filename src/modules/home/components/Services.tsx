import Router from "next/router";
import { BiRocket as RocketIcon } from "react-icons/bi";

import Button from "@/common/components/elements/Button";
import Card from "@/common/components/elements/Card";
import SectionHeading from "@/common/components/elements/SectionHeading";

const Services = () => {
  return (
    <section className="space-y-5">
      <div className="space-y-3">
        <SectionHeading title="서비스" />
      </div>
      <Card className="space-y-4 rounded-xl border bg-neutral-100 p-8 dark:border-none dark:bg-[#1e1e1e]">
        <div className="flex items-center gap-2">
          <RocketIcon size={24} />
          <h3 className="text-xl font-medium">문의사항</h3>
        </div>
        <p className="pl-2 leading-[1.8] text-neutral-800 dark:text-neutral-300 md:leading-loose">
          문의사항이 있으시다면 아래 메일로 문의해주세요!
        </p>
        <Button
          data-umami-event="Click Contact Button"
          onClick={() => Router.push("/contact")}
        >
          문의하기
        </Button>
      </Card>
    </section>
  );
};

export default Services;
