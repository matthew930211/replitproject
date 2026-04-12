import { useState, useRef, useEffect } from "react";
import { useWebSocket } from "@/lib/websocket";
import { useGetMe, useListMessages, getListMessagesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, X, Send, Minus } from "lucide-react";

export function ChatWidget() {
  const [isMinimized, setIsMinimized] = useState(false);
  const [content, setContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: user } = useGetMe();
  const { sendMessage, unreadCount, resetUnread, isConnected, chatOpen: isOpen, setChatOpen: setIsOpen } = useWebSocket();

  const { data: messages } = useListMessages(
    { limit: 50 },
    {
      query: {
        queryKey: getListMessagesQueryKey({ limit: 50 }),
        refetchInterval: false,
      },
    }
  );

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      resetUnread();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized, resetUnread]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim()) return;
    sendMessage(content.trim());
    setContent("");
    setTimeout(scrollToBottom, 100);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center hover:scale-105 active:scale-95"
        data-testid="chat-widget-toggle"
      >
        <MessageSquare className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-72 rounded-t-lg shadow-xl border bg-card overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-2.5 bg-primary text-primary-foreground cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">Team Chat</span>
            {unreadCount > 0 && (
              <span className="w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              setIsMinimized(false);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] rounded-lg shadow-2xl border bg-card flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center justify-between px-4 py-2.5 bg-primary text-primary-foreground shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-medium">Team Chat</span>
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => setIsMinimized(true)}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => {
              setIsOpen(false);
              setIsMinimized(false);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/5" ref={scrollRef}>
        {(messages || []).map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
            >
              <Avatar className="w-7 h-7 mt-1 border shrink-0">
                <AvatarFallback
                  className={`text-[10px] ${isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                >
                  {msg.senderName?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%]`}
              >
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-[11px] font-medium text-foreground/80">
                    {isMe ? "You" : msg.senderName}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-pre-wrap ${
                    isMe
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-card border rounded-tl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2.5 bg-card border-t shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 h-9 text-sm bg-muted/20"
            data-testid="chat-widget-input"
          />
          <Button
            type="submit"
            disabled={!content.trim()}
            size="icon"
            className="h-9 w-9"
            data-testid="chat-widget-send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
