import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useSocket } from "../contexts/SocketContext";
import { Conversation, Message } from "../types";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get("/conversations");
      setConversations(res.data);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Update last message preview in real-time
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = ({ message }: { message: Message }) => {
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === message.conversationId
              ? { ...c, lastMessage: message }
              : c
          )
          .sort((a, b) => {
            const aTime = a.lastMessage?.createdAt ?? a.createdAt;
            const bTime = b.lastMessage?.createdAt ?? b.createdAt;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          })
      );
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_stream_end", ({ messageId: _, body: __ }: { messageId: string; body: string }) => {
      // Refresh to get latest last message
      fetchConversations();
    });

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("message_stream_end");
    };
  }, [socket, fetchConversations]);

  const addConversation = (conv: Conversation) => {
    setConversations((prev) => {
      if (prev.find((c) => c.id === conv.id)) return prev;
      return [conv, ...prev];
    });
  };

  return { conversations, isLoading, refresh: fetchConversations, addConversation };
}
