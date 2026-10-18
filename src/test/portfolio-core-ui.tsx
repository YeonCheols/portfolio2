import { ReactNode } from "react";

export const Tooltip = ({
  children,
  title,
}: {
  children?: ReactNode;
  title?: string;
}) => (
  <span>
    {title}
    {children}
  </span>
);

export const StackIcon = ({ name }: { name?: string }) => <span>{name}</span>;

export const getIconComponent = (icon: string) =>
  icon
    ? ({
        className,
        title,
        size,
      }: {
        className?: string;
        title?: string;
        size?: number;
      }) => (
        <span className={className} title={title} data-size={size}>
          {icon}
        </span>
      )
    : null;

export type StackType = {
  name: string;
  icon: string;
  color: string;
  id: number;
};
