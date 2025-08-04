import { motion, AnimatePresence } from "framer-motion";
import { PiChatCircleDotsBold as ChatIcon } from "react-icons/pi";

import useChatStore from "@/common/stores/useChatStore";

import TechnicalChat from "./TechnicalChat";

const ChatButton = () => {
  const { isOpen, toggleChat } = useChatStore();

  return (
    <>
      <button
        onClick={toggleChat}
        className="group fixed bottom-4 right-4 flex items-center gap-2 rounded-full border-2 border-neutral-600 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600 to-purple-600 p-3 text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-3xl group-hover:!px-5 dark:from-blue-700 dark:to-purple-700 md:bottom-8 md:right-8 md:p-4 md:group-hover:!px-6"
        data-umami-event="Toggle Technical Chat Widget"
      >
        <ChatIcon size={28} />
        <span className="hidden group-hover:inline text-sm font-medium">
          AI 챗봇
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-20 shadow-lg md:bottom-8 md:left-auto md:right-8"
            initial={{
              opacity: 0,
              y: "100%",
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: "100%",
              scale: 0.95,
            }}
            transition={{
              duration: 0.4,
              ease: [0.25, 0.46, 0.45, 0.94], // cubic-bezier
              type: "spring",
              stiffness: 200,
              damping: 25,
            }}
          >
            <div className="shadow-3xl w-full rounded-xl border border-neutral-300 bg-neutral-50 ring-1 ring-black/5 backdrop-blur-2xl dark:divide-neutral-700 dark:border-neutral-600 dark:border-neutral-800 dark:bg-[#1b1b1b80]">
              <TechnicalChat isWidget={true} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatButton;
