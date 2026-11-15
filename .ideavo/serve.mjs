import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const port = Number(process.argv[2] || process.env.PORT || 3000);
const root = resolve(process.argv[3] || process.cwd());

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const server = createServer((req, res) => {
  let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  let filePath = normalize(join(root, pathname));

  if (!filePath.startsWith(root)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  } else if (!existsSync(filePath) && existsSync(`${filePath}.html`)) {
    filePath = `${filePath}.html`;
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" }).end("<h1>404 Not Found</h1>");
    return;
  }

  res.writeHead(200, {
    "content-type": types[extname(filePath).toLowerCase()] || "application/octet-stream",
    "access-control-allow-origin": "*",
    "cache-control": "no-cache",
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Serving ${root} on http://0.0.0.0:${port}`);
});
