import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { errMsg } from "@/lib/format";
import { VoicePlayer, VoiceRecorder } from "@/components/VoiceMessage";

export const Route = createFileRoute("/_authenticated/messages/$bookingId")({
  head: () => ({ meta: [{ title: "Conversation — Bës bi" }, { name: "description", content: "Conversation liée à une réservation." }, { property: "og:title", content: "Conversation — Bës bi" }, { property: "og:description", content: "Messagerie." }] }),
  component: Thread,
});

function Thread() {
  const { bookingId } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const key = ["thread", bookingId];

  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [b, m] = await Promise.all([
        supabase.from("bookings").select("*, services(name), providers(business_name)").eq("id", bookingId).single(),
        supabase.from("messages").select("*").eq("booking_id", bookingId).order("created_at"),
      ]);
      return { b: b.data, msgs: m.data ?? [] };
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`msg-${bookingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` }, () => qc.invalidateQueries({ queryKey: key }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    endRef.current?.scrollIntoView();
    if (data?.msgs.some((m) => !m.read_at && m.sender_id !== user?.id))
      supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("booking_id", bookingId).neq("sender_id", user!.id).is("read_at", null).then(() => {});
  }, [data, bookingId, user]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim().slice(0, 2000);
    if (!content) return;
    setText("");
    const { error } = await supabase.from("messages").insert({ booking_id: bookingId, sender_id: user!.id, content });
    if (error) toast.error(errMsg(error));
    qc.invalidateQueries({ queryKey: key });
  }

  async function sendVoice(blob: Blob, seconds: number, ext: string) {
    setUploading(true);
    const path = `${bookingId}/${user!.id}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from("chat-audio").upload(path, blob, { contentType: blob.type });
    if (up.error) { setUploading(false); toast.error("Échec de l'envoi du vocal"); return; }
    const { error } = await supabase.from("messages").insert({ booking_id: bookingId, sender_id: user!.id, content: "🎤 Message vocal", audio_path: path, audio_duration: seconds });
    setUploading(false);
    if (error) toast.error(errMsg(error));
    void qc.invalidateQueries({ queryKey: key });
  }

  if (!data?.b) return <div className="p-10 text-center text-muted-foreground">Chargement...</div>;
  return (
    <div className="mx-auto flex h-[calc(100vh-4rem-5rem)] max-w-3xl flex-col px-4 py-4 md:h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-3 border-b pb-3">
        <Link to="/messages" aria-label="Retour"><ArrowLeft className="h-5 w-5" /></Link>
        <div><b>{data.b.providers?.business_name}</b><p className="text-xs text-muted-foreground">{data.b.services?.name} · {new Date(data.b.date).toLocaleDateString("fr-FR")}</p></div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {data.msgs.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : ""}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-ink text-ink-foreground" : "bg-card border"}`}>
                {m.audio_path ? <VoicePlayer path={m.audio_path} duration={m.audio_duration} mine={mine} /> : m.content}
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-60">
                  {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  {mine && <CheckCheck className={`h-3 w-3 ${m.read_at ? "text-primary" : ""}`} />}
                </div>
              </div>
            </div>
          );
        })}
        {data.msgs.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Démarrez la conversation.</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t pt-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Votre message..." className="min-w-0 flex-1 rounded-full border bg-card px-4 py-3 outline-none focus:border-primary" />
        {text.trim()
          ? <button className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Envoyer"><Send className="h-5 w-5" /></button>
          : <VoiceRecorder disabled={uploading} onSend={sendVoice} />}
      </form>
    </div>
  );
}
