# StudyMate Web (Member 3 · Frontend)

Next.js 15 (App Router) + TypeScript + Tailwind v4. A 3-pane tutor UI: **Sources | Chat | Viewer**.

```bash
npm install
cp .env.example .env.local   # leave empty to use the mock SSE route
npm run dev
```

## Structure
```
src/
  types/contract.ts          # shared metadata contract + SSE event types
  lib/sse.ts                 # POST-based SSE reader (token/citation/done/error)
  lib/citations.ts           # "[Slide 4, 02:15]" → clickable segments
  lib/time.ts                # mm:ss <-> seconds
  context/ViewerContext.tsx  # citation → source resolution, seek target
  components/
    layout/AppShell.tsx      # 3-pane grid (tabs on mobile)
    chat/                    # ChatPanel, CitationChip
    viewer/ViewerPanel.tsx   # video (Day 3: Video.js) / pdf (Day 5: react-pdf)
    sources/, mastery/       # file list, mastery bars (Day 7: BKT + radar)
  app/api/mock-chat/         # mock SSE until Member 2's FastAPI is live
```

## SSE contract (draft, confirm with Member 2)
```
event: citation  data: {"id","label","file_name","page_number","start_time","end_time"}
event: token     data: {"text": "..."}
event: done      data: {"message_id": "..."}
event: error     data: {"message": "..."}
```
Citation events are sent **before** the tokens that reference them. `label` must match the inline `[...]` text exactly.
