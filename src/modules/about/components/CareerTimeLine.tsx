import { TimelineItem } from "@/common/types/careers";

interface CareerTimeLineProps {
  items: TimelineItem[];
  hideHeader?: boolean;
  compact?: boolean;
}

const CareerTimeLine = ({
  items,
  hideHeader = false,
  compact = false,
}: CareerTimeLineProps) => {
  return (
    <section>
      <div
        className={`${compact ? "py-4" : "py-8"} text-neutral-900 dark:text-neutral-100`}
      >
        <div
          className={`container mx-auto flex flex-col items-start md:flex-row ${compact ? "my-4 md:my-8" : "my-12 md:my-24"}`}
        >
          {!hideHeader && (
            <div className="flex flex-col w-full sticky md:top-36 lg:w-1/3 mt-2 md:mt-12 px-8">
              <p className="ml-2 uppercase tracking-loose text-yellow-600 dark:text-yellow-300">
                경력사항
              </p>
              <p className="text-3xl md:text-4xl leading-normal md:leading-relaxed mb-2">
                나의 여정
              </p>
            </div>
          )}
          <div
            className={`ml-0 ${!hideHeader ? "md:ml-12" : "md:ml-0"} lg:w-2/3 sticky`}
          >
            <div className="container mx-auto w-full h-full">
              <div
                className={`relative wrap overflow-hidden ${compact ? "p-0" : "p-10"} h-full`}
              >
                <div
                  className="border-2-2 border-yellow-555 absolute h-full border"
                  style={{
                    right: "50%",
                    border: "2px solid #FFC100",
                    borderRadius: "1%",
                  }}
                ></div>
                <div
                  className="border-2-2 border-yellow-555 absolute h-full border"
                  style={{
                    left: "50%",
                    border: "2px solid #FFC100",
                    borderRadius: "1%",
                  }}
                ></div>
                {items?.map((item, index) => {
                  const isLeft =
                    (item.align ?? (index % 2 === 0 ? "left" : "right")) ===
                    "left";
                  return (
                    <div
                      key={`${item.title}-${item.date}-${index}`}
                      className={`${compact ? "mb-6" : "mb-8"} flex justify-between items-center w-full ${
                        isLeft
                          ? "flex-row-reverse left-timeline"
                          : "right-timeline"
                      }`}
                    >
                      <div className="order-1 w-5/12"></div>
                      <div
                        className={`order-1 w-5/12 ${compact ? "" : "px-1 py-4"} ${
                          isLeft ? "text-right" : "text-left"
                        }`}
                      >
                        <p className="mb-3 text-base text-yellow-600 dark:text-yellow-300">
                          {item.date}
                        </p>
                        <h4
                          className={`mb-3 font-bold text-lg md:text-2xl ${isLeft ? "" : "text-left"}`}
                        >
                          {item.link ? (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-blue-500 hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
                            >
                              {item.title}
                            </a>
                          ) : (
                            item.title
                          )}
                        </h4>
                        <p className="text-sm md:text-base leading-snug text-neutral-700 dark:text-neutral-300">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CareerTimeLine;
