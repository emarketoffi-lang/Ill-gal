import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Trash2, MessageCircle } from "lucide-react";

interface MessageWithProfile {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string } | null;
}

export default function Discussion() {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<MessageWithProfile[]>([]);
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) {
      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, username").in("user_id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.username]) ?? []);
      const withProfiles = data.map(m => ({ ...m, profiles: { username: profileMap.get(m.user_id) ?? "Inconnu" } }));
      setMessages(withProfiles as MessageWithProfile[]);
      return;
    }
    if (data) setMessages(data as unknown as MessageWithProfile[]);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!content.trim()) return;
    const { error } = await supabase.from("messages").insert({ content: content.trim(), user_id: user!.id });
    if (error) toast.error(error.message);
    setContent("");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-3xl font-bold font-['Rajdhani'] tracking-wider flex items-center gap-2"><MessageCircle className="h-7 w-7 text-cyan-400" />COM DE 3RBI</h1>
        <p className="text-muted-foreground">Chat en temps réel entre membres</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {messages.map((m) => {
          const isOwn = m.user_id === user?.id;
          return (
            <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] rounded-lg px-4 py-2 ${isOwn ? "bg-primary/20 border border-primary/30" : "bg-muted/50 border border-border/50"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold ${isOwn ? "text-primary" : "text-foreground"}`}>
                    {m.profiles?.username ?? "Inconnu"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {role === "admin" && !isOwn && (
                    <button onClick={() => handleDelete(m.id)} className="text-destructive/50 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                  )}
                </div>
                <p className="text-sm">{m.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-4 border-t border-border/50 mt-2">
        <Input
          placeholder="Écrire un message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-muted/50"
        />
        <Button onClick={handleSend} size="icon"><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
