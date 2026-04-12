import { useEffect } from "react";
import { useLocation } from "wouter";
import { useWebSocket } from "@/lib/websocket";

export default function Chat() {
  const { resetUnread } = useWebSocket();
  const [, setLocation] = useLocation();

  useEffect(() => {
    resetUnread();
    setLocation("/dashboard");
  }, []);

  return null;
}
