import clsx from "clsx";
import { TbMoodSadSquint as MoodIcon } from "react-icons/tb";

type EmptyStatePageProps = {
  message: string;
  className?: string;
};

const EmptyState = ({ message, className }: EmptyStatePageProps) => {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center space-y-3 py-5 text-neutral-400 dark:text-neutral-500",
        className
      )}
    >
      <MoodIcon size={48} />
      <p>{message}</p>
    </div>
  );
};

export default EmptyState;
