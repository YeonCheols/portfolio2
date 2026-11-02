import { readFileSync } from "fs";
import { join } from "path";

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });

const readPage = (name: string): string =>
  readFileSync(join(__dirname, "pages", name), "utf8");

export const renderAdminConnectPage = (message: string): string =>
  readPage("admin-ai-models-connect.html").replace(
    "{{message}}",
    escapeHtml(message),
  );

export const renderAdminPage = (): string => readPage("admin-ai-models.html");
