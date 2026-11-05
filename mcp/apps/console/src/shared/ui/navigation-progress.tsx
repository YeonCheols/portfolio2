import { useEffect, useState } from "react";

// 이동이 끝나면 새 문서가 열리며 이 컴포넌트가 사라진다. 이동이 취소되거나 오래 걸려도 화면을 가리지 않게 거둔다
const clearAfterMs = 15_000;

const isPlainLeftClick = (event: MouseEvent) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;

// 같은 탭에서 다른 문서를 여는 링크인지 본다. 새 탭·내려받기·외부·같은 문서 앵커는 제외한다
const opensAnotherDocument = (link: HTMLAnchorElement): boolean => {
  if (link.target && link.target !== "_self") return false;
  if (link.hasAttribute("download")) return false;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  const sameDocument =
    url.pathname === window.location.pathname &&
    url.search === window.location.search;
  return !(sameDocument && url.hash);
};

export const NavigationProgress = () => {
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const start = () => {
      setNavigating(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setNavigating(false), clearAfterMs);
    };
    // 다른 핸들러가 기본 동작을 막았다면 이동하지 않으므로 표시하지 않는다
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || !isPlainLeftClick(event)) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (link instanceof HTMLAnchorElement && opensAnotherDocument(link))
        start();
    };
    const onSubmit = (event: Event) => {
      if (event.defaultPrevented) return;
      const form = event.target;
      if (
        form instanceof HTMLFormElement &&
        (!form.target || form.target === "_self")
      )
        start();
    };
    // 뒤로 가기로 캐시된 화면이 되살아나면 이동 중 표시가 남아 있을 수 있다
    const onPageShow = (event: Event) => {
      if ((event as PageTransitionEvent).persisted) setNavigating(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  if (!navigating) return null;
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">페이지를 이동하는 중입니다.</span>
      <div
        aria-hidden="true"
        className="nav-progress-bar fixed inset-x-0 top-0 z-50 h-1 bg-blue-600"
      />
    </div>
  );
};
