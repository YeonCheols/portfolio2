const fs = require("fs");
const http = require("http");
const https = require("https");
const { parse } = require("url");
const { networkInterfaces } = require("os");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const port = 3001;

const strings = {
  ready: "[ \x1b[32mready\x1b[0m ]",
  http: "\x1b[43mHTTP\x1b[0m",
  https: "\x1b[44mHTTPS\x1b[0m",
};

// 로컬 IP 주소 가져오기
const getLocalIP = () => {
  const nets = networkInterfaces();
  const results = {};

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // IPv4만 필터링하고 localhost가 아닌 주소만 선택
      // Node.js 버전에 따라 family 속성이 다를 수 있음
      if ((net.family === "IPv4" || net.family === 4) && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }

  // 첫 번째 사용 가능한 IP 반환
  for (const name of Object.keys(results)) {
    if (results[name].length > 0) {
      return results[name][0];
    }
  }

  return "127.0.0.1"; // 기본값
};

// 인증키 파일 존재 여부 확인
const keyPath = "./cert/local.ycseng.com-key.pem";
const certPath = "./cert/local.ycseng.com.pem";
const hasCertificates = fs.existsSync(keyPath) && fs.existsSync(certPath);

const httpsOptions = hasCertificates
  ? {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
      requestCert: false,
      rejectUnauthorized: false,
    }
  : null;

app.prepare().then(() => {
  if (hasCertificates) {
    // HTTPS 서버 실행
    https
      .createServer(httpsOptions, (req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      })
      .listen(port, (err) => {
        if (err) throw err;

        const localIP = getLocalIP();
        console.info(
          `${strings.https}  ${strings.ready} on https://local.ycseng.com:${port}`,
        );
        console.info(
          `${strings.https}  ${strings.ready} on https://${localIP}:${port}`,
        );
      });
  } else {
    // HTTP 서버 실행
    http
      .createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
      })
      .listen(port, (err) => {
        if (err) throw err;

        const localIP = getLocalIP();
        console.info(
          `${strings.http}  ${strings.ready} on http://local.ycseng.com:${port}`,
        );
        console.info(
          `${strings.http}  ${strings.ready} on http://${localIP}:${port}`,
        );
      });
  }
});
