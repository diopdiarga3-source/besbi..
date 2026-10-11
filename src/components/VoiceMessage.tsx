import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const MAX_VOICE_SECONDS = 120;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function VoiceRecorder({ onSend, disabled }: { onSend: (blob: Blob, seconds: number, ext: string) => Promise<void>; disabled?: boolean }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const chunks = useRef<Blob[]>([]);
  const cancelled = useRef(false);
  const start = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function begin() {
    if (typeof MediaRecorder === "undefined") { toast.error("L'enregistrement vocal n'est pas pris en charge sur cet appareil"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = []; cancelled.current = false;
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
        const seconds = Math.min(MAX_VOICE_SECONDS, Math.round((Date.now() - start.current) / 1000));
        setRec(null); setSecs(0);
        if (cancelled.current || seconds < 1) return;
        const mime = r.mimeType || "audio/webm";
        const blob = new Blob(chunks.current, { type: mime });
        void onSend(blob, seconds, mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm");
      };
      start.current = Date.now();
      r.start();
      setRec(r);
      timer.current = setInterval(() => {
        const s = (Date.now() - start.current) / 1000;
        setSecs(s);
        if (s >= MAX_VOICE_SECONDS) r.stop();
      }, 200);
    } catch {
      toast.error("Autorisez l'accès au micro pour envoyer un vocal");
    }
  }

  if (!rec) {
    return (
      <button type="button" disabled={disabled} onClick={() => void begin()} aria-label="Enregistrer un vocal"
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-ink-foreground disabled:opacity-50">
        <Mic className="h-5 w-5" />
      </button>
    );
  }
  const left = MAX_VOICE_SECONDS - secs;
  return (
    <div className="flex flex-1 items-center gap-3 rounded-full border bg-card px-2 py-1.5">
      <button type="button" onClick={() => { cancelled.current = true; rec.stop(); }} aria-label="Annuler" className="grid h-9 w-9 place-items-center rounded-full text-destructive hover:bg-muted">
        <Trash2 className="h-5 w-5" />
      </button>
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
      <span className="font-mono text-sm font-bold">{fmt(secs)}</span>
      <div className="flex flex-1 items-center gap-0.5 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="w-1 rounded-full bg-primary" style={{ height: `${6 + ((i * 7 + Math.floor(secs * 5)) % 16)}px` }} />
        ))}
      </div>
      {left <= 15 && <span className="text-xs font-bold text-destructive">{Math.ceil(left)} s</span>}
      <button type="button" onClick={() => rec.stop()} aria-label="Envoyer le vocal" className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}

export function VoicePlayer({ path, duration, mine }: { path: string; duration: number | null; mine: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [rate, setRate] = useState(1);
  const audio = useRef<HTMLAudioElement>(null);
  const total = duration ?? 0;

  useEffect(() => {
    let ok = true;
    void supabase.storage.from("chat-audio").createSignedUrl(path, 3600).then(({ data }) => { if (ok) setUrl(data?.signedUrl ?? null); });
    return () => { ok = false; };
  }, [path]);

  function toggle() {
    const a = audio.current; if (!a) return;
    if (a.paused) void a.play(); else a.pause();
  }
  function cycle() {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next); if (audio.current) audio.current.playbackRate = next;
  }
  const pct = total ? Math.min(100, (pos / total) * 100) : 0;

  return (
    <div className="flex w-56 items-center gap-2">
      {url && <audio ref={audio} src={url} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setPos(0); }} onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)} />}
      <button type="button" onClick={toggle} disabled={!url} aria-label={playing ? "Pause" : "Lecture"}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${mine ? "bg-primary text-primary-foreground" : "bg-ink text-ink-foreground"}`}>
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted-foreground/30">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] opacity-70">{fmt(playing || pos ? pos : total)}</span>
      </div>
      <button type="button" onClick={cycle} className="rounded-full border px-1.5 text-[10px] font-bold">{rate}x</button>
    </div>
  );
}
