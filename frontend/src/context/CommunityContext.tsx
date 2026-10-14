"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { communitiesApi, personalApi } from "@/lib/api";
import type { Community, CommunityResource } from "@/types/contract";

const KEY = "studymate.communities";
const ACTIVE_KEY = "studymate.activeCommunity";

interface CommunityState {
  communities: Community[];
  active: Community | null;
  resources: CommunityResource[];
  setActive: (id: string | null) => void;
  create: (name: string, description?: string) => Promise<void>;
  join: (code: string) => Promise<void>;
  leave: (id: string) => Promise<void>;
  regenerateCode: (id: string) => Promise<void>;
  uploadResource: (file: File) => Promise<void>;
  deleteResource: (resource: CommunityResource) => Promise<void>;
}

const Ctx = createContext<CommunityState | null>(null);

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

/** The backend has no "list my communities" endpoint, so memberships are remembered per browser. */
export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [resources, setResources] = useState<CommunityResource[]>([]);

  useEffect(() => {
    setCommunities(read<Community[]>(KEY, []));
    setActiveId(read<string | null>(ACTIVE_KEY, null));
  }, []);

  const active = communities.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    let stale = false;
    // No active community means the personal space: the user's own private files.
    (active ? communitiesApi.resources(active.id) : personalApi.resources()).then((r) => !stale && setResources(r)).catch(() => !stale && setResources([]));
    return () => {
      stale = true;
    };
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = (next: Community[]) => {
    setCommunities(next);
    write(KEY, next);
  };
  const setActive = useCallback((id: string | null) => {
    setActiveId(id);
    write(ACTIVE_KEY, id);
  }, []);

  const add = (c: Community) => {
    persist([...communities.filter((x) => x.id !== c.id), c]);
    setActive(c.id);
  };

  const value = useMemo<CommunityState>(
    () => ({
      communities,
      active,
      resources,
      setActive,
      create: async (name, description) => add(await communitiesApi.create(name, description)),
      join: async (code) => add(await communitiesApi.join(code.trim())),
      leave: async (id) => {
        await communitiesApi.leave(id);
        persist(communities.filter((c) => c.id !== id));
        if (activeId === id) setActive(null);
      },
      uploadResource: async (file) => {
        const r = active ? await communitiesApi.uploadResource(active.id, file) : await personalApi.upload(file);
        setResources((prev) => [...prev, r]);
      },
      deleteResource: async (resource) => {
        if (active) {
          await communitiesApi.removeResource(active.id, resource.id);
        } else {
          await personalApi.remove(resource.id);
        }
        setResources((prev) => prev.filter((item) => item.id !== resource.id));
      },
      regenerateCode: async (id) => {
        const { new_invite_code } = await communitiesApi.regenerate(id);
        persist(communities.map((c) => (c.id === id ? { ...c, invite_code: new_invite_code } : c)));
      },
    }),
    [communities, active, resources, activeId],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCommunities() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCommunities must be used inside <CommunityProvider>");
  return v;
}
