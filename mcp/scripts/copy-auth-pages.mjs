import fs from "fs";
import path from "path";

const source = path.resolve("src/auth/pages");
const destination = path.resolve("dist/auth/pages");

fs.cpSync(source, destination, { recursive: true });
