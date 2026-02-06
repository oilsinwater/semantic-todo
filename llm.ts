import { readFileSync } from "fs";
import { getSchema, executeSQL } from "./db";

const LLAMAFILE_URL = "http://127.0.0.1:8081/v1/chat/completions";
const SYSTEM_PROMPT_PATH = "./prompts/backend.md";

function loadSystemPrompt(): string {
  const template = readFileSync(SYSTEM_PROMPT_PATH, "utf-8");
  const schema = getSchema();
  return template.replace("{{SCHEMA}}", schema);
}

interface LLMResponse {
  html: string;
  sql?: string;
  reasoning?: string;
}

export async function chat(userMessage: string): Promise<LLMResponse> {
  const systemPrompt = loadSystemPrompt();

  const response = await fetch(LLAMAFILE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen2.5-3b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Parse the structured response
  return parseResponse(content);
}

function parseResponse(content: string): LLMResponse {
  // Extract SQL if present
  const sqlMatch = content.match(/<sql>([\s\S]*?)<\/sql>/);
  const sql = sqlMatch ? sqlMatch[1].trim() : undefined;

  // Extract reasoning if present
  const reasoningMatch = content.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : undefined;

  // Extract HTML
  const htmlMatch = content.match(/<html>([\s\S]*?)<\/html>/);
  let html = htmlMatch ? htmlMatch[1].trim() : content;

  // If there's SQL, execute it and inject data into HTML
  if (sql) {
    const result = executeSQL(sql);
    
    if (!result.success) {
      html = `<div class="error">Database error: ${result.error}</div>`;
      console.error("SQL Error:", result.error);
      console.error("SQL:", sql);
    } else if (result.data) {
      // Replace {{DATA}} placeholder with actual data
      html = injectData(html, result.data);
    }
  }

  return { html, sql, reasoning };
}

function injectData(html: string, data: any): string {
  // Handle {{DATA}} for full dataset
  if (html.includes("{{DATA}}")) {
    if (Array.isArray(data)) {
      const rendered = data.map(renderTodoItem).join("\n");
      return html.replace("{{DATA}}", rendered);
    } else {
      return html.replace("{{DATA}}", renderTodoItem(data));
    }
  }

  // Handle {{ITEM}} for single item
  if (html.includes("{{ITEM}}")) {
    return html.replace("{{ITEM}}", renderTodoItem(data));
  }

  return html;
}

function renderTodoItem(todo: any): string {
  const completed = todo.completed ? "checked" : "";
  const strikethrough = todo.completed ? "line-through" : "none";
  
  return `
    <div class="todo-item" data-id="${todo.id}">
      <input type="checkbox" ${completed}
        hx-post="/chat"
        hx-vals='{"message": "toggle todo ${todo.id}"}'
        hx-target="#todo-list"
        hx-swap="innerHTML" />
      <span style="text-decoration: ${strikethrough}">${escapeHtml(todo.title)}</span>
      <button class="delete"
        hx-post="/chat"
        hx-vals='{"message": "delete todo ${todo.id}"}'
        hx-target="#todo-list"
        hx-swap="innerHTML">×</button>
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
