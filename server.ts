import { chat } from "./llm";
import { readFileSync } from "fs";

const PORT = 3000;

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Serve index.html
  if (url.pathname === "/" && req.method === "GET") {
    const html = readFileSync("./index.html", "utf-8");
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Handle chat requests from HTMX
  if (url.pathname === "/chat" && req.method === "POST") {
    try {
      const formData = await req.formData();
      const message = formData.get("message") as string | null;

      if (!message) {
        return new Response('<div class="error">No message provided</div>', {
          headers: { "Content-Type": "text/html" },
        });
      }

      console.log(`\n[REQUEST] ${message}`);
      const startTime = Date.now();

      const response = await chat(message);

      const elapsed = Date.now() - startTime;
      console.log(`[SQL] ${response.sql || "none"}`);
      console.log(`[TIME] ${elapsed}ms`);

      return new Response(response.html, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error: any) {
      console.error("[ERROR]", error);
      return new Response(
        `<div class="error">Error: ${error.message}</div>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }
  }

  // Health check for LLM connection
  if (url.pathname === "/health") {
    try {
      const llmResponse = await fetch("http://127.0.0.1:8081/v1/models");
      if (llmResponse.ok) {
        return new Response("OK", { status: 200 });
      }
    } catch {
      return new Response("LLM not connected", { status: 503 });
    }
  }

  return new Response("Not found", { status: 404 });
}

console.log(`
╔═══════════════════════════════════════════╗
║         Semantic Todo Experiment          ║
╠═══════════════════════════════════════════╣
║  App server:  http://localhost:${PORT}        ║
║  LLM server:  http://localhost:8081       ║
╚═══════════════════════════════════════════╝

Make sure llamafile is running:
  ./llamafile/qwen2.5-3b.llamafile --server --host 127.0.0.1 --port 8081
`);

Bun.serve({
  port: PORT,
  fetch: handleRequest,
});
