# Project Handoff Document

**Date:** 2026-02-05  
**Author:** Claude (with Phill)

---

## Overview

Two experimental projects exploring unconventional architectures:

| Project | Status | Purpose |
|---------|--------|---------|
| **Semantic Todo** | v0 skeleton complete | LLM-as-middleware proof of concept |
| **Media Attestor** | v1 implementation complete | Media archival with cryptographic provenance |

---

# Project 1: Semantic Todo

## Concept

Replace traditional API contracts (REST, GraphQL) with natural language negotiation between models. A small local LLM acts as the "mouthpiece" for a database, interpreting intent and generating SQL.

## Architecture

```
[Browser] → HTMX POST → [Bun server] → [llamafile] → SQL → HTML fragment
                                              ↓
                                    idiomorph patches DOM
```

No routes. No controllers. No ORM. The model *is* the API.

## Current State

- **Complete:** File skeleton, system prompts, HTMX frontend, Bun server, SQLite setup
- **Not started:** Actual testing with llamafile running

## Files

```
semantic-todo/
├── server.ts              # Bun HTTP server (~50 lines)
├── llm.ts                 # llamafile client wrapper
├── db.ts                  # SQLite setup + query execution
├── index.html             # HTMX + idiomorph frontend
├── prompts/
│   └── backend.md         # LLM system prompt with schema injection
├── llamafile/             # (user downloads model here)
└── data/
    └── todos.db           # SQLite database
```

## Setup Required

1. Install Bun: `curl -fsSL https://bun.sh/install | bash`
2. Download model (~2GB):

   ```bash
   cd semantic-todo/llamafile
   curl -L -o qwen2.5-3b.llamafile \
     "https://huggingface.co/Mozilla/Qwen2.5-3B-Instruct-llamafile/resolve/main/Qwen2.5-3B-Instruct.Q4_K_M.llamafile"
   chmod +x qwen2.5-3b.llamafile
   ```

3. Mac only: `xattr -d com.apple.quarantine llamafile/qwen2.5-3b.llamafile`
4. Initialize DB: `bun run db.ts`
5. Start llamafile: `./llamafile/qwen2.5-3b.llamafile --server --host 127.0.0.1 --port 8081`
6. Start app: `bun run server.ts`
7. Open: <http://localhost:3000>

## Experiment Goals

| Metric | Target |
|--------|--------|
| Round-trip latency | < 2s |
| SQL accuracy | > 90% |
| Graceful ambiguity handling | No silent failures |

## Future Phases

1. **Current (v0):** Backend model only, hardcoded schema in prompt
2. **Phase 2:** Backend discovers schema from `sqlite_master`
3. **Phase 3:** Add client-side model (WebLLM) for intent interpretation
4. **Phase 4:** Let models negotiate a compressed protocol
5. **Phase 5:** "Site that builds itself" — model generates novel UI components

## Open Questions

- Can models develop shorthand over time?
- Who holds conversation state — client or server model?
- What happens when they misunderstand each other?
- How do you debug a negotiation?

---

# Project 2: Media Attestor

## Concept

Archive media from URLs with cryptographic attestation records. Each downloaded file gets a JSON provenance record with SHA256 hashes, timestamps, source metadata, and tool versions.

## Architecture

```
[URL] → [yt-dlp] → [media files] → [hash + metadata] → [attestation.json]
                         ↓
              [organized local storage]
              [master index.json]
```

## Current State

- **Complete:** Full v1 implementation
- **Working:** archive, status, verify, list commands
- **Deferred:** Metadata-only mode, cryptographic signing

## Files

```
media-attestor/
├── pyproject.toml
├── README.md
└── src/
    └── media_attestor/
        ├── __init__.py
        ├── cli.py           # Click CLI with all commands
        ├── downloader.py    # yt-dlp wrapper
        ├── attestation.py   # JSON record generation
        ├── hasher.py        # SHA256/MD5 hashing
        └── storage.py       # Directory organization + index
```

## Setup Required

```bash
cd media-attestor
pip install -e .
```

Dependencies: Python 3.10+, yt-dlp, click

## Usage

```bash
# Archive a URL
media-attestor archive "https://youtube.com/watch?v=VIDEO_ID"

# Batch archive
media-attestor archive --batch urls.txt

# Check if archived
media-attestor status "https://youtube.com/watch?v=VIDEO_ID"

# Verify file integrity
media-attestor verify ./archive/youtube/@channel/VIDEO_ID/attestation.json

# List all archived
media-attestor list
```

## Output Structure

```
archive/
├── index.json                    # Master index (skip logic)
└── youtube/
    └── @channelhandle/
        └── VIDEO_ID/
            ├── attestation.json  # Provenance record
            ├── VIDEO_ID.mp4
            ├── VIDEO_ID.webp
            └── VIDEO_ID.en.vtt
```

## Attestation Schema

```json
{
  "version": "1.0.0",
  "attestation": {
    "id": "att_abc123def456",
    "created_at": "2026-02-05T12:34:56Z",
    "tool_version": "media-attestor/0.1.0",
    "yt_dlp_version": "2024.01.01"
  },
  "source": {
    "url": "https://...",
    "retrieved_at": "2026-02-05T12:34:50Z",
    "extractor": "youtube"
  },
  "content": {
    "id": "VIDEO_ID",
    "title": "...",
    "uploader": "...",
    "upload_date": "20230415",
    "duration_seconds": 212
  },
  "files": [
    {
      "type": "video",
      "filename": "VIDEO_ID.mp4",
      "filesize_bytes": 52428800,
      "hash": { "sha256": "e3b0c44..." }
    }
  ],
  "signature": null
}
```

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| One attestation per media item | Simpler than nested playlist records |
| Skip if URL in index | Prevents duplicates, `--force` to override |
| SHA256 primary hash | Widely accepted, collision-resistant |
| Signature field present but null | Schema ready for v2 signing |

## v2 Roadmap

1. **Cryptographic signing** — Sign attestations with local key
2. **Metadata-only mode** — Fetch info without downloading files
3. **Playlist support** — `playlist.json` linking child attestations
4. **Remote storage** — S3/B2 backend option
5. **Web UI** — Simple interface for non-CLI users

---

# Deliverables

| File | Contents |
|------|----------|
| `semantic-todo.zip` | Complete Bun/HTMX/llamafile skeleton |
| `media-attestor.zip` | Complete Python CLI tool |
| `handoff.md` | This document |

---

# Context for Future Work

## Design Philosophy

Both projects explore **reducing abstraction layers**:

- Semantic Todo asks: "What if the model *is* the API?"
- Media Attestor asks: "What's the minimum viable provenance record?"

## Technical Bets

- **Small local models are good enough** for structured tasks (SQL generation, metadata extraction)
- **HTMX + server-rendered HTML** is underrated for simple apps
- **Single-binary deployment** (llamafile, Bun) reduces ops complexity
- **JSON attestation** is more portable than database records

## What Could Go Wrong

| Risk | Mitigation |
|------|------------|
| LLM generates bad SQL | Log everything, add guardrails in prompt |
| Latency too high | Try smaller model, add caching |
| yt-dlp breaks on site changes | Pin version, watch upstream |
| Attestation schema needs changes | Version field allows migration |

---

# Contact

This work was done in conversation with **Phill** (they/he).

LinkedIn: <https://www.linkedin.com/in/philliph-drummond>
