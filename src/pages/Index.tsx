import { useEffect, useState } from "react";
import { LogOut, MessageCircle } from "lucide-react";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { Button } from "@/components/ui/button";
import { chatService } from "@/lib/chatService";
import { useAuth } from "@/contexts/AuthContext";
import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";

const Index = () => {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);

  // ✅ PERBAIKAN: Loading & polling conversations
  useEffect(() => {
    document.title = "WhatChat — Pesan cepat, aman, gratis";

    // Function untuk load conversations
    const loadConversations = async () => {
      try {
        console.log("📥 [Index] Loading conversations...");
        const data = await chatService.listConversations();
        setConversations(data || []);
        console.log("✅ [Index] Conversations loaded:", data?.length || 0);
      } catch (error) {
        console.error("❌ [Index] Gagal load conversations:", error);
      }
    };

    // Load langsung saat mount
    loadConversations();

    // ✅ Polling: Refresh setiap 5 detik
    const interval = setInterval(() => {
      loadConversations();
    }, 5000);

    console.log("⏱️ [Index] Polling interval started (5 seconds)");

    return () => {
      clearInterval(interval);
      console.log("⏱️ [Index] Polling interval stopped");
    };
  }, []);

  // ✅ PERBAIKAN: Callback ketika chat baru dibuat
  const handleNewChat = async (newConversation: Conversation) => {
    console.log("🆕 [Index] New conversation created:", newConversation.id);
    setActive(newConversation);

    // Refresh conversation list
    try {
      const updated = await chatService.listConversations();
      setConversations(updated || []);
      console.log("🔄 [Index] Conversation list di-refresh");
    } catch (error) {
      console.error("❌ [Index] Gagal refresh conversation list:", error);
    }
  };

  if (!user) return null;

  return (
    <main className="h-screen w-screen bg-[hsl(var(--chat-bg))]">
      <h1 className="sr-only">WhatChat — aplikasi chat realtime</h1>
      <div className="mx-auto flex h-full max-w-[1500px]">
        <div className={cn("relative h-full w-full md:flex md:max-w-md", active && "hidden md:flex")}>
          <Sidebar
            me={user}
            conversations={conversations}
            activeId={active?.id ?? null}
            onSelect={setActive}
            onNewChat={handleNewChat}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={logout}
            className="absolute bottom-4 right-4 z-10 rounded-full bg-card text-muted-foreground shadow-md hover:text-destructive"
            aria-label="Keluar"
            title={`Keluar (${user.email ?? user.name})`}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
        <div className={cn("h-full w-full flex-1", !active && "hidden md:block")}>
          {active ? (
            <ChatWindow
              conversation={active}
              meId={user.id}
              onBack={() => setActive(null)}
            />
          ) : (
            <div className="chat-pattern flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="rounded-full bg-card p-6 shadow-[var(--shadow-elevated)]">
                <MessageCircle className="h-14 w-14 text-primary" />
              </div>
              <h2 className="text-2xl font-light text-foreground">
                Halo, {user.name} 👋
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Pilih percakapan untuk mulai mengobrol. ID Anda:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{user.id}</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default Index;