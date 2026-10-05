"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";

/** Programmatic control surface, exposed via ref. All times are in seconds. */
export interface VideoPlayerHandle {
  /** Seek to `seconds` (waits for metadata if needed). Plays by default. */
  seekTo: (seconds: number, opts?: { play?: boolean }) => void;
  /** Play [start, end) then pause at `end`. */
  playSegment: (start: number, end: number | null) => void;
  getCurrentTime: () => number;
  pause: () => void;
}

interface Props {
  src: string;
  /** Cited segment: highlighted on the progress bar and auto-played on change. */
  start: number | null;
  end: number | null;
  /** Bump to re-seek even when start/end are unchanged (repeat citation clicks). */
  nonce: number;
  onTimeUpdate?: (seconds: number) => void;
}

const MIME: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", ogg: "video/ogg", m3u8: "application/x-mpegURL" };
const mimeFor = (src: string) => MIME[src.split("?")[0].split(".").pop()?.toLowerCase() ?? ""] ?? "video/mp4";

/** Video.js wrapper with deep-link seeking and a cited-segment marker. */
export const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(function VideoPlayer(
  { src, start, end, nonce, onTimeUpdate },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const stopAtRef = useRef<number | null>(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  // Mount once. Video.js mutates the DOM, so it gets its own element outside React's tree.
  useEffect(() => {
    const el = document.createElement("video-js");
    el.classList.add("vjs-big-play-centered", "vjs-fluid");
    hostRef.current!.appendChild(el);

    const player = videojs(el, {
      controls: true,
      preload: "metadata",
      playbackRates: [0.75, 1, 1.25, 1.5, 2],
      userActions: { hotkeys: true },
    });
    player.on("timeupdate", () => {
      const t = player.currentTime() ?? 0;
      onTimeUpdateRef.current?.(t);
      if (stopAtRef.current !== null && t >= stopAtRef.current) {
        stopAtRef.current = null;
        player.pause();
      }
    });
    // Manual scrubbing cancels a pending segment stop.
    player.on("seeking", () => {
      const t = player.currentTime() ?? 0;
      if (stopAtRef.current !== null && t > stopAtRef.current) stopAtRef.current = null;
    });
    playerRef.current = player;

    return () => {
      player.dispose();
      playerRef.current = null;
    };
  }, []);

  /** Run `fn` once metadata (duration) is available. */
  const whenReady = (fn: (p: Player) => void) => {
    const p = playerRef.current;
    if (!p) return;
    if (p.readyState() >= 1) fn(p);
    else p.one("loadedmetadata", () => fn(p));
  };

  /** Seek once ready; `stopAt` is set in the same tick so a deferred seek can't clear it. */
  const seek = (seconds: number, play: boolean, stopAt: number | null) =>
    whenReady((p) => {
      stopAtRef.current = stopAt;
      p.currentTime(clamp(seconds, p.duration()));
      if (play) p.play()?.catch(() => {}); // autoplay may be blocked; the seek still lands
    });

  const api: VideoPlayerHandle = {
    seekTo: (seconds, { play = true } = {}) => seek(seconds, play, null),
    playSegment: (s, e) => seek(s, true, e !== null && e > s ? e : null),
    getCurrentTime: () => playerRef.current?.currentTime() ?? 0,
    pause: () => playerRef.current?.pause(),
  };
  useImperativeHandle(ref, () => api);

  // Source changes.
  useEffect(() => {
    playerRef.current?.src({ src, type: mimeFor(src) });
  }, [src]);

  // Citation target changes → seek + mark the segment.
  useEffect(() => {
    if (start === null) {
      playerRef.current?.el().querySelector(".sm-segment")?.remove();
      return;
    }
    api.playSegment(start, end);
    whenReady((p) => drawSegment(p, start, end));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, start, end, nonce]);

  return <div ref={hostRef} data-vjs-player className="overflow-hidden rounded-lg" />;
});

function clamp(t: number, duration: number | undefined) {
  const max = duration && Number.isFinite(duration) ? Math.max(0, duration - 0.1) : Infinity;
  return Math.min(Math.max(0, t), max);
}

/** Highlight [start, end] on the Video.js progress bar. */
function drawSegment(p: Player, start: number, end: number | null) {
  const holder = p.el().querySelector(".vjs-progress-holder");
  const duration = p.duration();
  if (!holder || !duration || !Number.isFinite(duration)) return;

  let mark = holder.querySelector<HTMLDivElement>(".sm-segment");
  if (!mark) {
    mark = document.createElement("div");
    mark.className = "sm-segment";
    holder.appendChild(mark);
  }
  const left = (start / duration) * 100;
  const width = end !== null && end > start ? ((end - start) / duration) * 100 : 0.6;
  mark.style.left = `${left}%`;
  mark.style.width = `${Math.min(width, 100 - left)}%`;
}
