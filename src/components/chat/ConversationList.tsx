import { format, isToday, isYesterday, isValid } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { cn } from "../../lib/utils";
import { Avatar } from "./Avatar";
import type { Conversation } from "../../lib/types";
import { chatService } from "../../lib/chatService";

interface Props {
  activeId: string | null;
  onSelect: (c: Conversation) => void;
  meId: string;
  conversations?: Conversation[]; // ✅ Optional prop untuk manual conversations
}

const formatTime = (iso: string | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (!isValid(d)) return "";
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Kemarin";
  return format(d, "dd/MM/yy", { locale: idLocale });
};

export const ConversationList = ({ activeId, onSelect, meId, conversations: propConversations }: Props) => {
  // ✅ Query conversations hanya jika tidak ada prop
  const {
    data: fetchedConversations,
    isLoading,
    isError,
  } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: chatService.listConversations,
    enabled: !propConversations, // ✅ Hanya fetch jika prop tidak ada
  });

  // ✅ Gunakan prop conversations jika ada, else gunakan fetched data
  const conversations = propConversations || fetchedConversations || [];

  if (isLoading && !conversations.length) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Memuat percakapan...</div>;
  }

  if (isError && !conversations.length) {
    return <div className="p-8 text-center text-sm text-red-500">Gagal memuat data.</div>;
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground italic">
        Belum ada percakapan. Mulai chat baru sekarang!
      </div>
    );
  }

  return (
    <ul className="scrollbar-thin flex-1 overflow-y-auto bg-background">
      {conversations.map((c) => {
        // ✅ Null/undefined safety check
        if (!c || !c.id) {
          console.warn("⚠️ [ConversationList] Conversation object invalid:", c);
          return null;
        }

        // ✅ Safe ID conversions (string comparison)
        const cId = String(c.id);
        const activeIdStr = activeId ? String(activeId) : null;
        const meIdStr = String(meId);

        const last = c.last_message;

        // ✅ Safe sender_id comparison
        const isMe = last?.sender_id ? String(last.sender_id) === meIdStr : false;

        // ✅ Safe active state check
        const isActive = cId === activeIdStr;

        // ✅ Safe participant filtering
        const partner = c.participants?.find(p => p && String(p.id) !== meIdStr);

        const displayName = c.is_group
          ? (c.name || "Grup Tanpa Nama")
          : (partner?.name || "User WhatChat");

        const displayAvatar = c.is_group
          ? c.avatar
          : (partner?.avatar || null);

        const isOnline = !c.is_group && !!partner?.online;

        return (
          <li key={cId}>
            <button
              onClick={() => onSelect(c)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-3 text-left transition-all border-b border-border/40",
                isActive ? "bg-secondary" : "hover:bg-secondary/50"
              )}
            >
              <Avatar
                name={displayName}
                src={displayAvatar}
                size={50}
                online={isOnline}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-semibold text-foreground">
                    {displayName}
                  </span>
                  {last && (
                    <span
                      className={cn(
                        "shrink-0 text-[11px]",
                        (c.unread_count ?? 0) > 0
                          ? "text-emerald-500 font-bold"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatTime(last.created_at)}
                    </span>
                  )}
                </div>

                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] text-muted-foreground flex-1">
                    {isMe && (
                      <span className="text-muted-foreground/70 mr-1 font-medium">
                        Anda:
                      </span>
                    )}
                    {last?.body ?? "Mulai percakapan..."}
                  </p>

                  {(c.unread_count ?? 0) > 0 && (
                    <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white shadow-sm">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
};