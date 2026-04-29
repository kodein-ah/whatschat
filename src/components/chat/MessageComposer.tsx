import { useEffect, useRef, useState } from "react";
import { Mic, Paperclip, Send, Smile, X, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import type { User } from "../../lib/types";
import { echo as Echo } from "../../lib/echo";
import { toast } from "sonner";

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

  // ✅ PERBAIKAN 1: Typing indicator via Echo
  useEffect(() => {
    if (!conversationId || !me) return;
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    if (text.trim().length > 0) {
      typingTimeoutRef.current = setTimeout(() => {
        try {
          Echo.private(`conversation.${conversationId}`)
            .whisper('typing', { id: me.id, name: me.name });
          console.log("📤 [MessageComposer] Typing indicator sent");
        } catch (error) {
          console.warn("⚠️ [MessageComposer] Typing indicator error:", error);
        }
      }, 300);
    }
    
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [text, conversationId, me]);

  // ✅ PERBAIKAN 2: Auto-expand textarea
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [text]);

  // ✅ PERBAIKAN 3: File preview
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
    
    setPreviewUrl(null);
  }, [file]);

  // ✅ PERBAIKAN 4: Submit handler
  const submit = () => {
    const t = text.trim();
    
    // ✅ Validasi
    if ((!t && !file) || isSending) {
      if (!t && !file) {
        toast.error("Pesan atau file tidak boleh kosong");
      }
      return;
    }

    console.log("📤 [MessageComposer] Submitting message", {
      textLength: t.length,
      hasFile: !!file,
      conversationId
    });

    try {
      onSend(t, file ?? undefined);
      setText("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      console.error("❌ [MessageComposer] Submit error:", error);
      toast.error("Gagal mengirim: " + (error?.message || "Unknown error"));
    }
  };

  // ✅ PERBAIKAN 5: File picker handler
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    
    if (!f) {
      console.log("ℹ️ [MessageComposer] File picker cancelled");
      return;
    }

    console.log("📎 [MessageComposer] File selected:", {
      name: f.name,
      size: f.size,
      type: f.type
    });

    // ✅ Validate file size
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`File terlalu besar. Maksimal ${MAX_FILE_MB}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // ✅ Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(f.type)) {
      toast.error("Tipe file tidak didukung");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFile(f);
    toast.success(`File "${f.name}" dipilih`);
  };

  const hasContent = text.trim().length > 0 || !!file;

  return (
    <div className="flex flex-col gap-1 bg-[hsl(var(--chat-header))]/5 px-2 py-2 md:px-4 md:py-3">
      {/* ✅ File preview */}
      {file && (
        <div className="mx-1 flex items-center gap-3 rounded-xl bg-card px-3 py-2 shadow-sm border border-border">
          <div className="relative h-12 w-12 shrink-0">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Pratinjau" 
                className="h-12 w-12 rounded-md object-cover"
                onError={(e) => {
                  console.error("❌ Error loading preview:", previewUrl);
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Paperclip className="h-5 w-5" />
              </div>
            )}
            
            {/* ✅ Loading overlay */}
            {isSending && (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{file.name}</div>
            <div className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
          
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="rounded-full" 
            onClick={() => {
              setFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            disabled={isSending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ✅ Input area */}
      <div className="flex items-end gap-2">
        <div className="flex flex-1 items-end gap-1 rounded-3xl bg-card px-2 py-1 shadow-sm border border-border">
          {/* Emoji button */}
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-foreground transition-colors" 
            disabled={isSending}
            title="Emoji (coming soon)"
          >
            <Smile className="h-5 w-5" />
          </Button>

          {/* Attachment button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            title="Lampirkan file"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip"
            onChange={onPick}
            disabled={isSending}
          />

          {/* Textarea */}
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
            placeholder="Ketik pesan..."
            className={cn(
              "flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-[15px] outline-none",
              "placeholder:text-muted-foreground text-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            disabled={isSending}
          />
        </div>

        {/* Send/Voice button */}
        <Button
          type="button"
          size="icon"
          onClick={hasContent ? submit : onVoice}
          className={cn(
            "h-11 w-11 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          )}
          disabled={isSending && hasContent}
          title={hasContent ? "Kirim pesan (Enter)" : "Voice note (coming soon)"}
        >
          {isSending && hasContent ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            hasContent ? <Send className="h-5 w-5" /> : <Mic className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
};