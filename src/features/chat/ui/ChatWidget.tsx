import ChatWidgetHeader from "./ChatWidgetHeader";

interface ChatWidgetProps {
  isOpen: boolean;
  toggleChat: () => void;
}

const ChatWidget = ({ isOpen, toggleChat }: ChatWidgetProps) => {
  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden ${
          isOpen ? "block" : "hidden"
        }`}
        onClick={toggleChat}
      />

      {/* Chat Widget */}
      <div
        className={`fixed inset-0 z-50 md:inset-auto md:bottom-12 md:right-5 md:z-20 ${
          isOpen ? "block" : "hidden"
        }`}
      >
        <div className="h-full md:h-auto md:max-h-[90vh] shadow-3xl w-full rounded-xl border border-neutral-300 bg-neutral-50 ring-1 ring-black/5 backdrop-blur-2xl dark:divide-neutral-700 dark:border-neutral-600 dark:border-neutral-800 dark:bg-[#1b1b1b80] md:w-[400px]">
          <ChatWidgetHeader />
        </div>
      </div>
    </>
  );
};

export default ChatWidget;
