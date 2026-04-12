import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { useClerk, useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { getListMessagesQueryKey, getGetPresenceQueryKey } from "@workspace/api-client-react";

interface OnlineUser {
  userId: number;
  name: string;
  role: string;
}

interface ChatMessage {
  id: number;
  senderId: number;
  senderName: string | null;
  senderRole: string | null;
  content: string;
  createdAt: string;
}

interface WebSocketContextValue {
  isConnected: boolean;
  onlineUsers: OnlineUser[];
  messages: ChatMessage[];
  sendMessage: (content: string) => void;
  unreadCount: number;
  resetUnread: () => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  isConnected: false,
  onlineUsers: [],
  messages: [],
  sendMessage: () => {},
  unreadCount: 0,
  resetUnread: () => {},
  chatOpen: false,
  setChatOpen: () => {},
});

export function useWebSocket() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const { session } = useClerk();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatOpen, setChatOpenState] = useState(false);
  const chatOpenRef = useRef(false);

  const resetUnread = useCallback(() => {
    setUnreadCount(0);
    chatOpenRef.current = true;
  }, []);

  const setChatOpen = useCallback((open: boolean) => {
    setChatOpenState(open);
    chatOpenRef.current = open;
    if (open) {
      setUnreadCount(0);
    }
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "chat:send", content }));
    }
  }, []);

  const connect = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !session) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const token = await session.getToken();
      if (!token) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/ws?token=${encodeURIComponent(token)}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "presence:update") {
            setOnlineUsers(data.data);
            queryClient.setQueryData(getGetPresenceQueryKey(), data.data);
          }

          if (data.type === "chat:message") {
            setMessages((prev) => [...prev, data.data]);
            queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey({ limit: 50 }) });
            if (!chatOpenRef.current) {
              setUnreadCount((c) => c + 1);
            }
          }
        } catch {}
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;

        if (event.code !== 4001 && event.code !== 4003) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          reconnectTimerRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {};
    } catch {}
  }, [isLoaded, isSignedIn, session, queryClient]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      connect();
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isLoaded, isSignedIn, connect]);

  useEffect(() => {
    if (!isConnected || !wsRef.current) return;

    const heartbeat = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "presence:heartbeat" }));
      }
    }, 30000);

    return () => clearInterval(heartbeat);
  }, [isConnected]);

  return (
    <WebSocketContext.Provider
      value={{ isConnected, onlineUsers, messages, sendMessage, unreadCount, resetUnread, chatOpen, setChatOpen }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}
