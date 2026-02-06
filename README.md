# Semantic Todo

LLM-as-middleware experiment. A todo app where natural language is the API.

## Prerequisites

- **Bun** (v1.0+): https://bun.sh
- ~4GB disk space for the model

## Setup

### 1. Install Bun (if needed)

```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Download the model

```bash
cd semantic-todo
mkdir -p llamafile
cd llamafile

# Download Qwen2.5-3B-Instruct (2.0GB)
curl -L -o qwen2.5-3b.llamafile \
  https://huggingface.co/Mozilla/Qwen2.5-3B-Instruct-llamafile/resolve/main/Qwen2.5-3B-Instruct.Q4_K_M.llamafile

# Make executable
chmod +x qwen2.5-3b.llamafile

cd ..
```

### 3. Initialize the database

```bash
bun run db.ts
```

### 4. Start everything

You need two terminal windows:

**Terminal 1 - Start the LLM server:**
```bash
./llamafile/qwen2.5-3b.llamafile --server --host 127.0.0.1 --port 8081
```

Wait until you see "HTTP server listening" before starting the app server.

**Terminal 2 - Start the app server:**
```bash
bun run server.ts
```

### 5. Open the app

Go to http://localhost:3000

## How it works

```
[Browser] → HTMX POST to /chat → [Bun server] → [llamafile] → SQL → HTML fragment
                                                      ↓
                                              idiomorph patches DOM
```

The LLM:
1. Receives natural language from the user
2. Generates SQL based on the schema
3. Executes the query
4. Returns an HTML fragment

No REST API. No GraphQL. Just conversation.

## Project structure

```
semantic-todo/
├── server.ts          # Bun HTTP server
├── llm.ts             # llamafile client
├── db.ts              # SQLite setup
├── index.html         # Frontend (HTMX + Alpine)
├── prompts/
│   └── backend.md     # LLM system prompt
├── llamafile/
│   └── qwen2.5-3b.llamafile
└── data/
    └── todos.db
```

## Experiment notes

Things to observe:
- Latency per request
- Success rate of SQL generation
- How the model handles ambiguity
- Edge cases that break it

## Troubleshooting

**llamafile won't start:**
- On Mac, you may need: `xattr -d com.apple.quarantine llamafile/qwen2.5-3b.llamafile`
- Check you have enough RAM (~4GB free)

**Model responds slowly:**
- First request loads the model into memory (~10-20s)
- Subsequent requests should be 1-3s

**SQL errors:**
- Check server.ts console for the generated SQL
- The model sometimes hallucinates column names
