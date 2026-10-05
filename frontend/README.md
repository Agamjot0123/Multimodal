# StudyMate Web (Member 3 · Frontend)

Next.js 15 (App Router) + TypeScript + Tailwind v4. A 3-pane tutor UI: **Sources | Chat | Viewer**.

```bash
npm install
cp .env.example .env.local   # leave empty to use the mock route
npm run dev
```

## Structure
```
src/
  types/contract.ts          # mirrors Backend/schemas.py + UI-only types
  lib/api.ts                 # POST /api/chat client, backend citation → UI citation
  lib/citations.ts           # "[Slide 4, 02:15]" → clickable segments
  lib/time.ts                # mm:ss <-> seconds
  lib/deeplink.ts            # ?src=…&t=02:15&end=02:52&page=N <-> viewer target
  context/ViewerContext.tsx  # citation → source resolution, seek target
  components/
    layout/AppShell.tsx      # 3-pane grid (tabs on mobile)
    chat/                    # ChatPanel, CitationChip
    viewer/ViewerPanel.tsx   # video / pdf (Day 5: react-pdf)
    viewer/VideoPlayer.tsx   # Video.js player: seekTo / playSegment / getCurrentTime via ref
    sources/, mastery/       # file list, mastery bars (Day 7: BKT + radar)
  app/api/mock-chat/         # mock of POST /api/chat until Member 2's FastAPI is live
```

## Backend contract (`Backend/schemas.py`)
```
POST /api/chat?provider=groq|gemini
request:  { "query": str, "retrieved_contexts": [{ "chunk_id", "text",
            "metadata": { "file_name", "page_number", "start_time", "end_time" } }] }
response: { "answer": str, "citations": [{ "chunk_id", "file_name", "page_number",
            "start_time", "end_time" }] }
error:    { "detail": str }  (HTTP 500)
```
Times are `"mm:ss"` strings; `lib/api.ts` converts them to seconds for the viewer. The backend does no
retrieval, so `retrieved_contexts` currently comes from `MOCK_CONTEXTS` in `data/mockCourse.ts`.
Inline `[file | Page: N, Timestamp: mm:ss-mm:ss]` text in the answer (the label format the backend
uses in its prompt) becomes a clickable chip; cited sources not referenced inline are listed under the answer.

## Video player & deep links
`VideoPlayer` wraps Video.js and exposes a ref handle:
```ts
player.current?.seekTo(135);           // seconds; waits for metadata if needed
player.current?.playSegment(135, 172); // plays the cited clip, pauses at the end
player.current?.getCurrentTime();
```
Clicking a timestamp citation seeks to it, highlights the clip on the progress bar, and stops at
`end_time`. The open source is mirrored in the URL, so links are shareable and reload-safe:
`/?src=lecture_03_backprop.mp4&t=02:15&end=02:52` (also `t=135`) or `/?src=deep_learning_textbook.pdf&page=45`.
"Copy link at current time" in the viewer produces one of these.
