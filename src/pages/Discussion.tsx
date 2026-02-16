import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Trash2, MessageCircle } from "lucide-react";
import { syncToSupabase } from "@/lib/supabaseSync";

interface Message {
  id: string;
  content: string;
  created_at: string;
  username: string;
  user_id: string;
}

export default function Discussion() {
  const { user, role } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("underworld_messages");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading messages:", e);
      }
    }

    // Listen for messages from other tabs/windows
    const handleMessagesUpdated = (event: any) => {
      setMessages(event.detail);
    };

    window.addEventListener("messagesUpdated", handleMessagesUpdated);
    return () => window.removeEventListener("messagesUpdated", handleMessagesUpdated);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!content.trim() || !user) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      created_at: new Date().toISOString(),
      username: user.username,
      user_id: user.id,
    };

    const updated = [...messages, newMessage];
    setMessages(updated);
    localStorage.setItem("underworld_messages", JSON.stringify(updated));
    syncToSupabase("messages", newMessage);
    window.dispatchEvent(new CustomEvent("messagesUpdated", { detail: updated }));

    setContent("");
    toast.success("Message envoyé");
  };

  const handleDelete = (id: string) => {
    const updated = messages.filter(m => m.id !== id);
    setMessages(updated);
    localStorage.setItem("underworld_messages", JSON.stringify(updated));
    syncToSupabase("messages", { id, deleted: true });
    window.dispatchEvent(new CustomEvent("messagesUpdated", { detail: updated }));
    toast.success("Message supprimé");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-3xl font-bold font-['Rajdhani'] tracking-wider flex items-center gap-2"><MessageCircle className="h-7 w-7 text-cyan-400" />Discussion interne</h1>
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
                    {m.username}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {role === "admin" && !isOwn && (
                    <button onClick={() => handleDelete(m.id)} className="text-destructive/50 hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
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
