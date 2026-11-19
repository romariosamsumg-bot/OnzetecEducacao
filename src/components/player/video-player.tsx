"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Captions, CaptionsOff, Maximize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/components/ui/button";
import { saveProgress } from "@/server/actions/interactions";
import type { Caption } from "@/lib/content/types";

type Props = {
  contentId: string;
  src: string;
  type: "video/mp4" | "application/x-mpegURL";
  poster: string | null;
  captions: Caption[];
  title: string;
  initialPosition: number;
  trackProgress: boolean;
  next?: { href: string; title: string } | null;
  vertical?: boolean;
};

const SPEEDS = [0.75, 1, 1.25, 1.5];
const SAVE_EVERY_MS = 15000;

function fmt(t: number) {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function spokenTime(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m > 0 ? `${m} minuto${m > 1 ? "s" : ""} e ${s} segundo${s !== 1 ? "s" : ""}` : `${s} segundo${s !== 1 ? "s" : ""}`;
}

/**
 * Reprodutor acessível: controles grandes com texto, sem reprodução automática,
 * velocidade, legendas, tela cheia, retomada e registro de progresso.
 */
export function VideoPlayer({ contentId, src, type, poster, captions, title, initialPosition, trackProgress, next, vertical }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const lastSaved = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  // Preferência de legendas salva no aparelho (lida sem causar renderizações em cascata)
  const storedCaptions = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem("oz_captions");
      } catch {
        return null;
      }
    },
    () => null,
  );
  const [captionsOverride, setCaptionsOn] = useState<boolean | null>(null);
  const captionsOn = captionsOverride ?? storedCaptions !== "off";
  const [ended, setEnded] = useState(false);
  const [resumeFrom, setResumeFrom] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  const [error, setError] = useState<string | null>(null);
  const speedId = useId();

  // Fonte HLS: nativa (Android/Safari) ou hls.js carregado sob demanda.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let destroy: (() => void) | undefined;
    if (type === "application/x-mpegURL" && !video.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) {
          setError("Seu navegador não consegue reproduzir este vídeo. Tente atualizar o navegador.");
          return;
        }
        const hls = new Hls({ capLevelToPlayerSize: true });
        hls.loadSource(src);
        hls.attachMedia(video);
        destroy = () => hls.destroy();
      });
    } else {
      video.src = src;
    }
    return () => destroy?.();
  }, [src, type]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    for (const track of Array.from(v.textTracks)) track.mode = captionsOn ? "showing" : "hidden";
  }, [captionsOn, duration]);

  const persist = useCallback(
    async (force = false) => {
      const v = videoRef.current;
      if (!trackProgress || !v || !v.duration) return;
      const now = Date.now();
      if (!force && now - lastSaved.current < SAVE_EVERY_MS) return;
      lastSaved.current = now;
      await saveProgress({ contentId, position: v.currentTime, duration: v.duration }).catch(() => {});
    },
    [contentId, trackProgress],
  );

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void persist(true);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      void persist(true);
    };
  }, [persist]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => setError("Não foi possível iniciar o vídeo. Verifique sua internet e tente novamente."));
    } else v.pause();
  };

  const seekBy = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min((v.duration || 0) - 0.5, v.currentTime + delta));
    setAnnounce(`${delta > 0 ? "Avançou" : "Voltou"} 10 segundos. Agora em ${spokenTime(v.currentTime)}.`);
  };

  const fullscreen = () => {
    const el = wrapRef.current;
    const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el?.requestFullscreen) void el.requestFullscreen();
    else v?.webkitEnterFullscreen?.();
  };

  return (
    <div className="space-y-3">
      <div
        ref={wrapRef}
        className={cn(
          "relative overflow-hidden rounded-[var(--radius-card)] bg-navy-950",
          vertical ? "mx-auto aspect-[9/16] max-h-[70dvh]" : "aspect-video",
        )}
        onKeyDown={(e) => {
          if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "SELECT") return;
          if (e.key === " " || e.key === "k") {
            e.preventDefault();
            toggle();
          } else if (e.key === "ArrowRight") seekBy(10);
          else if (e.key === "ArrowLeft") seekBy(-10);
        }}
      >
        <video
          ref={videoRef}
          className="size-full bg-black object-contain"
          poster={poster ?? undefined}
          preload="metadata"
          playsInline
          crossOrigin="anonymous"
          aria-label={`Vídeo: ${title}`}
          onClick={toggle}
          onPlay={() => {
            setPlaying(true);
            setEnded(false);
            setResumeFrom(null);
          }}
          onPause={() => {
            setPlaying(false);
            void persist(true);
          }}
          onEnded={() => {
            setPlaying(false);
            setEnded(true);
            void persist(true);
          }}
          onTimeUpdate={(e) => {
            setTime(e.currentTarget.currentTime);
            void persist();
          }}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            setDuration(v.duration);
            if (initialPosition > 5 && initialPosition < v.duration - 5) {
              v.currentTime = initialPosition;
              setResumeFrom(initialPosition);
            }
          }}
          onError={() => setError("O vídeo não carregou. Verifique sua conexão e tente novamente.")}
        >
          {captions.map((c, i) => (
            <track key={c.url} kind="captions" src={c.url} srcLang={c.lang} label={c.label} default={i === 0} />
          ))}
        </video>
        {!playing && !ended ? (
          <button
            type="button"
            onClick={toggle}
            className="absolute inset-0 m-auto flex h-20 w-fit items-center gap-3 rounded-full bg-orange-500 px-7 text-[1.15rem] font-bold text-navy-950 shadow-[var(--shadow-raised)] hover:bg-orange-400"
          >
            <Play aria-hidden className="size-8 fill-current" />
            {resumeFrom ? "Continuar" : "Assistir"}
          </button>
        ) : null}
        {ended && next ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-navy-950/90 p-6 text-center text-white">
            <p className="text-[1.2rem] font-bold">Aula concluída!</p>
            <Link href={next.href} className="inline-flex min-h-14 items-center rounded-[var(--radius-control)] bg-orange-500 px-6 font-bold text-navy-950">
              Próxima aula: {next.title}
            </Link>
            <button type="button" onClick={toggle} className="min-h-11 font-semibold underline underline-offset-4">
              Assistir de novo
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-[var(--radius-control)] bg-danger-50 p-3 font-semibold text-danger-700">
          {error}
        </p>
      ) : null}

      {resumeFrom ? (
        <p className="flex flex-wrap items-center gap-2 text-ink-soft">
          Continuando de onde você parou ({fmt(resumeFrom)}).
          <button
            type="button"
            className="min-h-11 font-semibold text-orange-700 underline underline-offset-4"
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = 0;
              setResumeFrom(null);
              setAnnounce("Voltou para o início.");
            }}
          >
            Começar do início
          </button>
        </p>
      ) : null}

      <div className="rounded-[var(--radius-card)] border border-line bg-white p-3" role="group" aria-label="Controles do vídeo">
        <div className="flex items-center gap-3 px-1 pb-2">
          <span className="w-12 text-[0.9rem] tabular-nums text-ink-muted" aria-hidden>
            {fmt(time)}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(duration))}
            step={1}
            value={Math.floor(time)}
            onChange={(e) => {
              if (videoRef.current) videoRef.current.currentTime = Number(e.target.value);
            }}
            aria-label="Posição do vídeo"
            aria-valuetext={`${spokenTime(time)} de ${spokenTime(duration)}`}
            className="h-11 flex-1 accent-orange-500"
          />
          <span className="w-12 text-right text-[0.9rem] tabular-nums text-ink-muted" aria-hidden>
            {fmt(duration)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CtrlButton onClick={toggle} primary>
            {playing ? <Pause aria-hidden className="size-5" /> : <Play aria-hidden className="size-5" />}
            {playing ? "Pausar" : "Assistir"}
          </CtrlButton>
          <CtrlButton onClick={() => seekBy(-10)}>
            <RotateCcw aria-hidden className="size-5" /> Voltar 10 s
          </CtrlButton>
          <CtrlButton onClick={() => seekBy(10)}>
            <RotateCw aria-hidden className="size-5" /> Avançar 10 s
          </CtrlButton>
          {captions.length > 0 || type === "application/x-mpegURL" ? (
            <CtrlButton
              pressed={captionsOn}
              onClick={() => {
                const v = !captionsOn;
                setCaptionsOn(v);
                try {
                  localStorage.setItem("oz_captions", v ? "on" : "off");
                } catch {}
                setAnnounce(v ? "Legendas ligadas." : "Legendas desligadas.");
              }}
            >
              {captionsOn ? <Captions aria-hidden className="size-5" /> : <CaptionsOff aria-hidden className="size-5" />}
              Legendas
            </CtrlButton>
          ) : null}
          <CtrlButton
            pressed={muted}
            onClick={() => {
              const v = videoRef.current;
              if (!v) return;
              v.muted = !v.muted;
              setMuted(v.muted);
            }}
          >
            {muted ? <VolumeX aria-hidden className="size-5" /> : <Volume2 aria-hidden className="size-5" />}
            {muted ? "Sem som" : "Som"}
          </CtrlButton>
          <label htmlFor={speedId} className="sr-only">
            Velocidade
          </label>
          <select
            id={speedId}
            value={speed}
            onChange={(e) => {
              const s = Number(e.target.value);
              setSpeed(s);
              if (videoRef.current) videoRef.current.playbackRate = s;
              setAnnounce(`Velocidade ${s.toString().replace(".", ",")} vezes.`);
            }}
            className="min-h-11 rounded-full border-2 border-line bg-white px-3 font-semibold text-navy-900"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                Velocidade {s.toString().replace(".", ",")}x
              </option>
            ))}
          </select>
          <CtrlButton onClick={fullscreen}>
            <Maximize aria-hidden className="size-5" /> Tela cheia
          </CtrlButton>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

function CtrlButton({
  children,
  onClick,
  pressed,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  pressed?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[0.95rem] font-semibold",
        primary ? "bg-navy-900 text-white hover:bg-navy-800" : "border-2 border-line text-navy-900 hover:bg-navy-50",
        pressed && !primary && "border-navy-900 bg-navy-50",
      )}
    >
      {children}
    </button>
  );
}
