"use client";

import { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import type { ViewerTarget } from "@/context/ViewerContext";

type Player = ReturnType<typeof videojs>;

/** Video.js player with programmatic seeking. Re-seeks whenever `target.nonce` changes. */
export function VideoPlayer({ target }: { target: ViewerTarget }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);

  // Create once per source; dispose on unmount / source change.
  useEffect(() => {
    if (!hostRef.current) return;
    const el = document.createElement("video-js");
    el.classList.add("vjs-big-play-centered", "vjs-fluid");
    hostRef.current.appendChild(el);
    const player = videojs(el, {
      controls: true,
      preload: "metadata",
      fluid: true,
      playbackRates: [0.75, 1, 1.25, 1.5, 2],
      sources: [{ src: target.source.url, type: "video/mp4" }],
    });
    playerRef.current = player;
    return () => {
      player.dispose();
      playerRef.current = null;
    };
  }, [target.source.url]);

  // Seek on every citation click (nonce), even to the same timestamp.
  useEffect(() => {
    const p = playerRef.current;
    if (!p || target.start_time == null) return;
    const seek = () => {
      p.currentTime(target.start_time!);
      p.play()?.catch(() => {}); // autoplay may be blocked; seek still applies
    };
    if (p.readyState() >= 1) seek();
    else p.one("loadedmetadata", seek);
    return () => {
      p.off("loadedmetadata", seek);
    };
  }, [target.nonce, target.start_time, target.source.url]);

  return <div ref={hostRef} data-vjs-player className="overflow-hidden rounded-lg bg-black" />;
}
