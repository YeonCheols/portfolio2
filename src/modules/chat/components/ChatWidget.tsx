import ChatWidgetHeader from "./ChatWidgetHeader";

interface ChatWidgetProps {
  isOpen: boolean;
  toggleChat: () => void;
}

const ChatWidget = ({ isOpen, toggleChat }: ChatWidgetProps) => {
  return (
    <div
      className={`fixed bottom-0 z-20 shadow-lg md:bottom-12 md:right-5 ${
        isOpen ? "block" : "hidden"
      }`}
    >
      <div className="shadow-3xl w-full rounded-xl border border-neutral-300 bg-neutral-50 ring-1 ring-black/5 backdrop-blur-2xl dark:divide-neutral-700 dark:border-neutral-600 dark:border-neutral-800 dark:bg-[#1b1b1b80] md:w-[400px]">
        <ChatWidgetHeader />
      </div>
    </div>
  );
};

export default ChatWidget;
