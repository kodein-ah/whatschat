import { format, isValid } from "date-fns";
import { Download, FileText, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { Tick } from "./Tick";
import type { Message } from "../../lib/types";

interface Props {
  message: Message;
  meId: string;
  showAuthor?: boolean;
  authorName?: string;
}

const isImage = (mime?: string) => !!mime && mime.startsWith("image/");

const getAttachmentUrl = (attachment: Message['attachment']): string | null => {
    if (!attachment) return null;
    if (attachment.fileId) {
        return `https://lh3.googleusercontent.com/d/${attachment.fileId}`;
    }
    if (attachment.url) {
        return attachment.url;
    }
    return null;
}

export const MessageBubble = ({ message, meId, showAuthor, authorName }: Props) => {
  const mine = message.sender_id.toString() === meId.toString();
  const att = message.attachment;
  const dateObj = new Date(message.created_at);
  const timeString = isValid(dateObj) ? format(dateObj, "HH:mm") : "";
  const attachmentUrl = getAttachmentUrl(att);

  return (
    <div className={cn("flex w-full px-3", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative flex flex-col max-w-[78%] rounded-lg px-2.5 py-1.5 text-[15px] leading-snug shadow-[var(--shadow-bubble)]",
          mine ? "rounded-tr-sm bg-[hsl(var(--chat-bubble-out))] text-foreground" : "rounded-tl-sm bg-[hsl(var(--chat-bubble-in))] text-foreground",
          attachmentUrl && isImage(att?.mime) && !message.body ? "p-1" : "pr-16"
        )}
      >
        {showAuthor && !mine && authorName && (
          <div className="mb-0.5 px-1 text-xs font-semibold text-primary">{authorName}</div>
        )}

        {attachmentUrl && isImage(att?.mime) && (
          <a href={attachmentUrl} target="_blank" rel="noreferrer" className={cn("relative block", message.body ? "mb-1" : "")}>
            <img src={attachmentUrl} alt={att?.name || "Attachment"} className="max-h-80 w-full rounded-md object-cover" loading="lazy" referrerPolicy="no-referrer" />
            {message.status === 'sending' && (
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
            )}
          </a>
        )}

        {attachmentUrl && !isImage(att?.mime) && (
          <a href={attachmentUrl} target="_blank" rel="noreferrer" download={att?.name} className="mb-1 flex items-center gap-2 rounded-md bg-background/60 px-2 py-2 hover:bg-background">
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{att?.name || "File"}</div>
              <div className="text-xs text-muted-foreground">{att?.size ? (att.size / 1024).toFixed(1) + " KB" : ""}</div>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
        )}

        {message.body && (
          <p className="whitespace-pre-wrap break-words px-1">{message.body}</p>
        )}

        <span className={cn("absolute bottom-1 right-2 flex items-center gap-1 text-[11px]", attachmentUrl && isImage(att?.mime) && !message.body ? "text-white drop-shadow-sm bg-black/20 rounded px-1 py-0.5" : "text-muted-foreground")}>
          {timeString}
          {mine && <Tick status={message.status} />}
        </span>
      </div>
    </div>
  );
};