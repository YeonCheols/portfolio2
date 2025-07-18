const fs = require("fs");
const http = require("http");
const https = require("https");
const { parse } = require("url");
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

        console.info(
          `${strings.https}  ${strings.ready} on https://local.ycseng.com:${port}`,
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

        console.info(
          `${strings.http}  ${strings.ready} on http://local.ycseng.com:${port}`,
        );
      });
  }
});
