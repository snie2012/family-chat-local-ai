import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../lib/api";
import { useSocket } from "../contexts/SocketContext";
import { Message, User } from "../types";

interface UseMessagesResult {
  messages: Message[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  sendMessage: (body: string) => void;
  retryMessage: (messageId: string) => void;
  loadMore: () => void;
  typingUsers: string[];
}

export function useMessages(conversationId: string, currentUser: User | null): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  // Maps userId → displayName so we can remove by userId when typing stops
  const [typingUsersMap, setTypingUsersMap] = useState<Record<string, string>>({});
  const cursorRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const pendingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const { socket } = useSocket();

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setIsLoading(true);
    try {
      const res = await api.get("/messages", {
        params: { conversationId, limit: 50 },
      });
      setMessages(res.data.messages);
      cursorRef.current = res.data.nextCursor;
      setHasMore(!!res.data.nextCursor);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  const loadMore = useCallback(async () => {
    if (!cursorRef.current || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const res = await api.get("/messages", {
        params: { conversationId, cursor: cursorRef.current, limit: 50 },
      });
      setMessages((prev) => [...res.data.messages, ...prev]);
      cursorRef.current = res.data.nextCursor;
      setHasMore(!!res.data.nextCursor);
    } catch (err) {
      console.error("Failed to load more messages:", err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [conversationId, isFetchingMore]);

  // Keep a ref in sync with state so callbacks can access latest messages
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Clear pending timeouts on unmount
  useEffect(() => {
    return () => {
      pendingTimeoutsRef.current.forEach((tid) => clearTimeout(tid));
      pendingTimeoutsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    setMessages([]);
    setTypingUsersMap({});
    cursorRef.current = null;
    fetchMessages();
  }, [conversationId, fetchMessages]);

  // Join/leave room and handle real-time events
  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit("join_room", { conversationId });

    const handleNewMessage = ({ message }: { message: Message }) => {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => {
        if (prev.find((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    };

    const handleStreamStart = ({
      messageId,
      conversationId: convId,
      sender,
      thinkMode,
    }: {
      messageId: string;
      conversationId: string;
      sender: User;
      thinkMode?: boolean;
    }) => {
      if (convId !== conversationId) return;
      const placeholder: Message = {
        id: messageId,
        conversationId: convId,
        senderId: sender.id,
        body: "",
        isStreaming: true,
        isThinking: thinkMode ?? false,
        thinkingBody: "",
        createdAt: new Date().toISOString(),
        sender,
      };
      setMessages((prev) => [...prev, placeholder]);
    };

    const handleThinkChunk = ({
      messageId,
      chunk,
    }: {
      messageId: string;
      chunk: string;
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, thinkingBody: (m.thinkingBody ?? "") + chunk, isThinking: true }
            : m
        )
      );
    };

    const handleStreamChunk = ({
      messageId,
      chunk,
    }: {
      messageId: string;
      chunk: string;
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, body: m.body + chunk, isThinking: false }
            : m
        )
      );
    };

    const handleStreamEnd = ({
      messageId,
      body,
    }: {
      messageId: string;
      body: string;
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, body, isStreaming: false, isThinking: false }
            : m
        )
      );
    };

    const handleUserTyping = ({
      userId,
      displayName,
      conversationId: convId,
    }: {
      userId: string;
      displayName: string;
      conversationId: string;
    }) => {
      if (convId !== conversationId) return;
      if (userId === currentUser?.id) return;
      setTypingUsersMap((prev) =>
        prev[userId] === displayName ? prev : { ...prev, [userId]: displayName }
      );
    };

    const handleUserStoppedTyping = ({
      userId,
      conversationId: convId,
    }: {
      userId: string;
      conversationId: string;
    }) => {
      if (convId !== conversationId) return;
      setTypingUsersMap((prev) => {
        if (!(userId in prev)) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socket.on("new_message", handleNewMessage);
    socket.on("message_stream_start", handleStreamStart);
    socket.on("message_stream_think_chunk", handleThinkChunk);
    socket.on("message_stream_chunk", handleStreamChunk);
    socket.on("message_stream_end", handleStreamEnd);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stopped_typing", handleUserStoppedTyping);

    return () => {
      socket.emit("leave_room", { conversationId });
      socket.off("new_message", handleNewMessage);
      socket.off("message_stream_start", handleStreamStart);
      socket.off("message_stream_think_chunk", handleThinkChunk);
      socket.off("message_stream_chunk", handleStreamChunk);
      socket.off("message_stream_end", handleStreamEnd);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stopped_typing", handleUserStoppedTyping);
    };
  }, [socket, conversationId, currentUser?.id]);

  const sendMessage = useCallback(
    (body: string) => {
      if (!socket || !body.trim() || !currentUser) return;
      const trimmed = body.trim();
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Optimistically add the message immediately
      const optimistic: Message = {
        id: tempId,
        conversationId,
        senderId: currentUser.id,
        body: trimmed,
        isStreaming: false,
        isPending: true,
        createdAt: new Date().toISOString(),
        sender: currentUser,
      };
      setMessages((prev) => [...prev, optimistic]);

      // Timeout: mark as failed if no ack within 5 seconds
      const timeoutId = setTimeout(() => {
        pendingTimeoutsRef.current.delete(tempId);
        setMessages((prev) =>
          prev.map((m) => m.id === tempId ? { ...m, isPending: false, isFailed: true } : m)
        );
      }, 5000);
      pendingTimeoutsRef.current.set(tempId, timeoutId);

      socket.emit("send_message", { conversationId, body: trimmed }, (res: { ok: boolean }) => {
        const tid = pendingTimeoutsRef.current.get(tempId);
        if (tid) { clearTimeout(tid); pendingTimeoutsRef.current.delete(tempId); }

        if (res?.ok) {
          // Real message arrives via new_message; remove the optimistic copy
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        } else {
          setMessages((prev) =>
            prev.map((m) => m.id === tempId ? { ...m, isPending: false, isFailed: true } : m)
          );
        }
      });
    },
    [socket, conversationId, currentUser]
  );

  const retryMessage = useCallback(
    (messageId: string) => {
      const msg = messagesRef.current.find((m) => m.id === messageId);
      if (!msg) return;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      sendMessage(msg.body);
    },
    [sendMessage]
  );

  const typingUsers = Object.values(typingUsersMap);
  return { messages, isLoading, isFetchingMore, hasMore, sendMessage, retryMessage, loadMore, typingUsers };
}
