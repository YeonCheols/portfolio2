import { create } from "zustand";

interface ChatStoreProps {
  isOpen: boolean;
  toggleChat: () => void;
}

const useChatStore = create<ChatStoreProps>((set) => ({
  isOpen: false,
  toggleChat: () =>
    set((state) => {
      const newIsOpen = !state.isOpen;

      // 모바일에서 body 스크롤 제어
      if (typeof window !== "undefined") {
        const isMobile = window.innerWidth < 768; // md 브레이크포인트
        if (isMobile) {
          if (newIsOpen) {
            document.body.style.overflow = "hidden";
          } else {
            document.body.style.overflow = "";
          }
        }
      }

      return { isOpen: newIsOpen };
    }),
}));

export default useChatStore;
