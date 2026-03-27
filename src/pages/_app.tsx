import AOS from "aos";
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { DefaultSeo } from "next-seo";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";

import "tailwindcss/tailwind.css";
import "aos/dist/aos.css";
import "@/shared/styles/globals.css";

import CommandPalette from "@/features/cmdpallete/ui/CommandPalette";
import Layout from "@/widgets/layout";
import SentryErrorBoundary from "@/shared/ui/SentryErrorBoundary";
import { CommandPaletteProvider } from "@/features/cmdpallete/model/CommandPaletteContext";
import {
  firaCode,
  jakartaSans,
  onestSans,
  soraSans,
} from "@/shared/styles/fonts";

import defaultSEOConfig from "../../next-seo.config";

const ProgressBar = dynamic(() => import("src/shared/ui/ProgressBar"), {
  ssr: false,
});

const App = ({ Component, pageProps: { session, ...pageProps } }: AppProps) => {
  useEffect(() => {
    AOS.init({
      duration: 800,
      delay: 50,
    });
  }, []);

  return (
    <>
      <style jsx global>
        {`
          html {
            --jakartaSans-font: ${jakartaSans.style.fontFamily};
            --soraSans-font: ${soraSans.style.fontFamily};
            --firaCode-font: ${firaCode.style.fontFamily};
            --onestSans-font: ${onestSans.style.fontFamily};
          }
        `}
      </style>
      <DefaultSeo {...defaultSEOConfig} />
      <ThemeProvider attribute="class" defaultTheme="dark">
        <CommandPaletteProvider>
          <SentryErrorBoundary>
            <Layout>
              <CommandPalette />
              <ProgressBar />
              <Component {...pageProps} />
            </Layout>
          </SentryErrorBoundary>
        </CommandPaletteProvider>
      </ThemeProvider>
    </>
  );
};

export default App;
