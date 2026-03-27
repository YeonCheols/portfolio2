export interface CareerProps {
  position: string;
  company: string;
  logo: string | null;
  location: string;
  type: string;
  start_date: string;
  end_date: string | null;
  industry: string;
  link: string | null;
  responsibilities?: string[];
}

export interface TimelineItem {
  date: string;
  title: string;
  description: JSX.Element;
  align?: "left" | "right";
  link?: string;
}
