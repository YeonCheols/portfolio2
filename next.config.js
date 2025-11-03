// const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ["@yeoncheols/portfolio-core-ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // HMR 관련 설정
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    // ES 모듈 처리를 위한 설정
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
      ".mjs": [".mjs", ".mts"],
    };

    // 서버 사이드에서 ES 모듈 처리 개선
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
  // 서버 사이드 외부 패키지 설정 (Next.js 15에서 변경됨)
  serverExternalPackages: [],
};

module.exports = nextConfig;
// module.exports = withSentryConfig(nextConfig, {
//   // org와 project는 Sentry CLI에서 자동으로 감지되므로 제거
//   // Only print logs for uploading source maps in CI
//   // Set to `true` to suppress logs
//   silent: !process.env.CI,
//   // Automatically tree-shake Sentry logger statements to reduce bundle size
//   disableLogger: true,
// });
