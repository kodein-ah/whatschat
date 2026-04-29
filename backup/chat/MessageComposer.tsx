import { useEffect, useRef, useState } from "react";
import { Mic, Paperclip, Send, Smile, X, Loader2 } from "lucide-react"; // [JEBRED] Tambah icon Loader2
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import type { User } from "../../lib/types";
import { echo as Echo } from "../../lib/echo";

interface Props {
  onSend: (text: string, attachment?: File) => void;
  onVoice?: () => void;
  isSending?: boolean;
  conversationId: string;
  me: User;
}

const MAX_FILE_MB = 20;

export const MessageComposer = ({ 
  onSend, 
  onVoice, 
  isSending, 
  conversationId, 
  me 
}: Props) => {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId || !me) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (text.trim().length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        Echo.private(`conversation.${conversationId}`)
          .whisper('typing', { id: me.id, name: me.name });
      }, 300);
    }
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [text, conversationId, me]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [text]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  const submit = () => {
    const t = text.trim();
    if ((!t && !file) || isSending) return;
    onSend(t, file ?? undefined);
    setText("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      alert(`File terlalu besar. Maks ${MAX_FILE_MB}MB.`);
      e.target.value = "";
      return;
    }
    setFile(f);
  };

  const hasContent = text.trim().length > 0 || !!file;

  return (
    <div className="flex flex-col gap-1 bg-[hsl(var(--chat-header))]/5 px-2 py-2 md:px-4 md:py-3">
      {file && (
        <div className="mx-1 flex items-center gap-3 rounded-xl bg-card px-3 py-2 shadow-sm border border-border">
          {/* [JEBRED] Area preview file dengan loading indicator */}
          <div className="relative h-12 w-12 shrink-0">
            {previewUrl ? (
              <img src={previewUrl} alt="Pratinjau" className="h-12 w-12 rounded-md object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Paperclip className="h-5 w-5" />
              </div>
            )}
            {/* Overlay loading saat isSending aktif */}
            {isSending && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{file.name}</div>
            <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
          </div>
          <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={() => setFile(null)} disabled={isSending}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex flex-1 items-end gap-1 rounded-3xl bg-card px-2 py-1 shadow-sm border border-border">
          <Button type="button" variant="ghost" size="icon" className="rounded-full text-muted-foreground" disabled={isSending}>
            <Smile className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip"
            onChange={onPick}
            disabled={isSending}
          />
          <textarea
            ref={ref}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ketik pesan"
            className="flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-[15px] outline-none placeholder:text-muted-foreground"
            disabled={isSending}
          />
        </div>
        <Button
          type="button"
          size="icon"
          onClick={hasContent ? submit : onVoice}
          className="h-11 w-11 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={isSending && hasContent}
        >
          {isSending && hasContent ? <Loader2 className="h-5 w-5 animate-spin" /> : (hasContent ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />)}
        </Button>
      </div>
    </div>
  );
};