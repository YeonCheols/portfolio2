import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { BsBuildings as CompanyIcon } from "react-icons/bs";
import { HiChevronRight } from "react-icons/hi";

import cn from "@/shared/lib/cn";
import { EducationProps } from "@/shared/types/education";
import Card from "@/shared/ui/Card";
import Image from "@/shared/ui/Image";

const EducationCard = ({
  school,
  major,
  logo,
  degree,
  start_year,
  end_year,
  location,
  link,
  highlights,
}: EducationProps) => {
  const [isShowHighlights, setIsShowHighlights] = useState<boolean>(false);

  return (
    <Card className="flex gap-5 border border-neutral-300 px-6 py-4 dark:border-neutral-900">
      <div className="mt-1.5 w-fit">
        {logo ? (
          <Image src={logo} width={55} height={55} alt={school} />
        ) : (
          <CompanyIcon size={50} />
        )}
      </div>

      <div className="w-4/5 space-y-3">
        <div className="space-y-1">
          <a
            href={link || "#"}
            target="_blank"
            rel={link ? "noopener noreferrer" : undefined}
            data-umami-event={`Click Education School: ${school}`}
          >
            <h6>{school}</h6>
          </a>
          <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <div className="flex flex-col gap-1 md:flex-row md:gap-2">
              <span>{degree}</span>
              <span className="hidden text-neutral-300 dark:text-neutral-700 md:flex">
                •
              </span>
              <span>{major}</span>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:text-[13px]">
              <div className="flex gap-1 text-neutral-500">
                <span>{start_year}</span> - <span>{end_year || "Present"}</span>
              </div>
              <span className="hidden text-neutral-300 dark:text-neutral-700 lg:block">
                •
              </span>
              <span>{location}</span>
            </div>
          </div>
        </div>

        {highlights && highlights.length > 0 && (
          <>
            <button
              onClick={() => setIsShowHighlights(!isShowHighlights)}
              className="-ml-1 flex items-center gap-1 text-sm text-neutral-500"
              type="button"
            >
              <HiChevronRight
                size={18}
                className={cn({
                  "rotate-90 transition-all duration-300": isShowHighlights,
                })}
              />
              교육 내용
            </button>
            <AnimatePresence>
              {isShowHighlights && (
                <motion.ul
                  className="ml-5 list-disc space-y-1 pb-2 text-sm leading-normal text-neutral-600 dark:text-neutral-400"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {highlights.map((item) => (
                    <motion.li key={item} layout>
                      {item}
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </Card>
  );
};

export default EducationCard;
