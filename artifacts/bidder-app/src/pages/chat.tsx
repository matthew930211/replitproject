import { useState, useRef, useEffect } from "react";
import { useListMessages, getListMessagesQueryKey, useSendMessage, useGetMe } from "@workspace/api-client-react";
import { UserRole } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export default function Chat() {
  const { data: user } = useGetMe();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: messages, isLoading } = useListMessages({ limit: 50 }, {
    query: {
      refetchInterval: 3000,
    }
  });

  const sendMessage = useSendMessage();
  const [content, setContent] = useState("");

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim()) return;

    sendMessage.mutate({ data: { content: content.trim() } }, {
      onSuccess: () => {
        setContent("");
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey({ limit: 50 }) });
        setTimeout(scrollToBottom, 100);
      }
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col max-w-5xl mx-auto animate-in fade-in">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Team Chat</h1>
        <p className="text-muted-foreground">Real-time communication across the bidding team.</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-sidebar-border shadow-sm">
        <CardHeader className="py-3 border-b bg-muted/20">
          <CardTitle className="text-base font-medium flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            Live Operations Channel
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4 bg-muted/5 flex flex-col-reverse" ref={scrollRef}>
          {isLoading && !messages ? (
            <div className="space-y-4 w-full">
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="h-16 w-1/2 ml-auto" />
              <Skeleton className="h-16 w-2/3" />
            </div>
          ) : (
            <div className="space-y-4 flex flex-col justify-end">
              {[...(messages || [])].reverse().map((msg) => {
                const isMe = msg.senderId === user?.id;
                
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="w-8 h-8 mt-1 border">
                      <AvatarFallback className={isMe ? 'bg-primary text-primary-foreground text-xs' : 'bg-secondary text-secondary-foreground text-xs'}>
                        {msg.senderName?.charAt(0).toUpperCase() || <UserIcon className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground/80">
                          {isMe ? 'You' : msg.senderName}
                        </span>
                        {!isMe && msg.senderRole && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-muted-foreground/20 text-muted-foreground">
                            {msg.senderRole.replace('_', ' ')}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      
                      <div className={`p-3 rounded-lg text-sm shadow-sm whitespace-pre-wrap ${
                        isMe 
                          ? 'bg-primary text-primary-foreground rounded-tr-none' 
                          : 'bg-card border rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>

        <div className="p-3 bg-card border-t mt-auto">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-muted/20"
              disabled={sendMessage.isPending}
              data-testid="input-chat-message"
            />
            <Button type="submit" disabled={!content.trim() || sendMessage.isPending} size="icon" data-testid="btn-send-message">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
