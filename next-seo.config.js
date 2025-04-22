const canonicalUrl = "https://ycseng.vercel.app";
const metaImage =
  "https://ycseng.vercel.app/_next/image?url=%2Fimages%2Fproject%2Fportfolio.png&w=96&q=100";
const metaDescription =
  "누구나 자유롭게 개발을 이어갈 수 있는 환경을 좋아합니다. 명확한 의도가 드러나고, 알기 쉬운 코드를 작성하기 위해 끊임없이 고민하고 노력합니다.";

const defaultSEOConfig = {
  defaultTitle: "연철s - 포트폴리오",
  description: metaDescription,
  canonical: canonicalUrl,
  openGraph: {
    canonical: canonicalUrl,
    title: "연철s - 포트폴리오",
    description: metaDescription,
    type: "website",
    images: [
      {
        url: metaImage,
        alt: "연철s - 포트폴리오",
        width: 800,
        height: 600,
      },
      {
        url: metaImage,
        alt: "연철s - 포트폴리오",
        width: 1200,
        height: 630,
      },
      {
        url: metaImage,
        alt: "연철s - 포트폴리오",
        width: 1600,
        height: 900,
      },
    ],
    site_name: "ycseng.vercel.app",
  },
};

export default defaultSEOConfig;
