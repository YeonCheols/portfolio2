import { fetchResumeModel } from "../connection/resumeConnection";
import { createResumeMcpServer } from "./createResumeMcpServer";

export const startResumeMcpServer = () => {
  const token = process.env.MCP_AUTH_TOKEN ?? "";
  const resumeUrl = process.env.RESUME_CONNECTION_URL ?? "";
  const resumeToken = process.env.RESUME_CONNECTION_TOKEN ?? "";

  if (resumeUrl === "" || resumeToken === "") {
    throw new Error(
      "RESUME_CONNECTION_URL and RESUME_CONNECTION_TOKEN are required",
    );
  }

  const port = Number(process.env.PORT ?? 8080);

  return createResumeMcpServer({
    token,
    connection: {
      load: (input) =>
        fetchResumeModel(input, { url: resumeUrl, token: resumeToken }),
    },
  }).listen(port);
};

const entry = process.argv[1] ?? "";
if (entry.endsWith("server.ts") || entry.endsWith("server.js")) {
  startResumeMcpServer();
}
