"use client";

import { useRef, useState } from "react";
import { useCommunities } from "@/context/CommunityContext";
import { useAuth } from "@/components/auth/AuthGate";
import { COMMUNITIES_ENABLED } from "@/lib/api";

type Form = null | "create" | "join";

export function CommunitiesSection() {
  const { communities, active, resources, setActive, create, join, leave, regenerateCode, uploadResource, deleteResource } = useCommunities();
  const { user } = useAuth();
  const [form, setForm] = useState<Form>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!COMMUNITIES_ENABLED) {
    return (
      <div className="border-b border-slate-800 px-4 py-3 text-xs text-slate-500">
        Communities need a backend. Set <code>NEXT_PUBLIC_API_BASE_URL</code> to enable them.
      </div>
    );
  }

  const run = async (fn: () => Promise<void>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      after?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const done = () => (setForm(null), setName(""), setDesc(""), setCode(""));
    if (form === "create" && name.trim()) run(() => create(name.trim(), desc.trim()), done);
    if (form === "join" && code.trim()) run(() => join(code), done);
  };

  const isOwner = active && user && active.owner_id === user.id;
  const input = "w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm outline-none focus:border-indigo-500";

  return (
    <div className="border-b border-slate-800 px-4 pb-3">
      <h2 className="pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Community</h2>

      <select
        value={active?.id ?? ""}
        onChange={(e) => setActive(e.target.value || null)}
        className={input}
        aria-label="Active community"
      >
        <option value="">Personal (no community)</option>
        {communities.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <div className="mt-2 flex gap-2 text-xs">
        {(["create", "join"] as const).map((f) => (
          <button
            key={f}
            onClick={() => (setForm(form === f ? null : f), setError(null))}
            className={`rounded px-2 py-1 capitalize ${form === f ? "bg-slate-700" : "bg-slate-800 hover:bg-slate-700"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {form && (
        <form onSubmit={submit} className="mt-2 space-y-2">
          {form === "create" ? (
            <>
              <input className={input} placeholder="Community name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className={input} placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </>
          ) : (
            <input className={input} placeholder="Invite code" value={code} onChange={(e) => setCode(e.target.value)} />
          )}
          <button disabled={busy} className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-medium disabled:opacity-50">
            {busy ? "Working…" : form === "create" ? "Create community" : "Join community"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {active && (
        <div className="mt-3 space-y-2 text-xs">
          {active.description && <p className="text-slate-400">{active.description}</p>}
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Invite code</span>
            <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">{active.invite_code}</code>
            <button
              className="text-indigo-400 hover:underline"
              onClick={() => {
                navigator.clipboard?.writeText(active.invite_code).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex gap-3">
            {isOwner && (
              <button className="text-slate-400 hover:text-white" disabled={busy} onClick={() => run(() => regenerateCode(active.id))}>
                Regenerate code
              </button>
            )}
            <button
              className="text-red-400 hover:text-red-300"
              disabled={busy}
              onClick={() => confirm(`Leave ${active.name}?`) && run(() => leave(active.id))}
            >
              Leave
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs">
        <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-slate-500">{active ? "Shared resources" : "My files"}</p>
              <button
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="rounded bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700 disabled:opacity-50"
              >
                {busy ? "Uploading…" : "+ Add file"}
              </button>
              <input
                ref={fileRef}
                type="file"
                hidden
                accept=".pdf,.png,.jpg,.jpeg,.mp4,.webm,.mov,application/pdf,image/png,image/jpeg,video/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) run(() => uploadResource(f));
                }}
              />
            </div>
            {resources.length === 0 ? (
              <p className="text-slate-600">{active ? "Nothing shared yet." : "No files yet."}</p>
            ) : (
              <ul className="space-y-1">
                {resources.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-slate-300">
                    <span className="text-slate-500">{r.file_type === "video" ? "▶" : r.file_type === "image" ? "▣" : "❐"}</span>
                    <span className="min-w-0 flex-1 truncate">{r.file_name}</span>
                    <button
                      disabled={busy}
                      title="Delete file"
                      aria-label={`Delete ${r.file_name}`}
                      onClick={() => confirm(`Delete ${r.file_name}?`) && run(() => deleteResource(r.id))}
                      className="text-slate-500 hover:text-red-400 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>
    </div>
  );
}
