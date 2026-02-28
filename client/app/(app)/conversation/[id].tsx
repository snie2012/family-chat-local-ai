import React, { useEffect } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { markAsRead } from "../../../lib/storage";
import { useAuth } from "../../../contexts/AuthContext";
import { useMessages } from "../../../hooks/useMessages";
import { useSocket } from "../../../contexts/SocketContext";
import { MessageList } from "../../../components/MessageList";
import { MessageInput } from "../../../components/MessageInput";
import { api } from "../../../lib/api";
import { Conversation } from "../../../types";

function getConversationTitle(conv: Conversation | null, currentUserId: string | undefined): string {
  if (!conv) return "Chat";
  if (conv.name) return conv.name;
  if (conv.isGroup) return "Group Chat";
  const other = conv.members.find((m) => m.id !== currentUserId);
  return other?.displayName ?? "Chat";
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { isConnected } = useSocket();
  const navigation = useNavigation();

  const [conversation, setConversation] = React.useState<Conversation | null>(null);

  const {
    messages,
    isLoading,
    isFetchingMore,
    hasMore,
    sendMessage,
    retryMessage,
    loadMore,
    typingUsers,
  } = useMessages(id, user);

  useEffect(() => {
    if (id) markAsRead(id);
  }, [id]);

  // Mark as read when new messages arrive
  useEffect(() => {
    if (id && messages.length > 0) markAsRead(id);
  }, [messages.length]);

  useEffect(() => {
    if (!id) return;
    api.get(`/conversations/${id}`).then((res) => {
      const conv = {
        ...res.data,
        members: res.data.members,
      };
      setConversation(conv);
      navigation.setOptions({ title: getConversationTitle(conv, user?.id) });
    });
  }, [id, user?.id]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      {!isConnected && (
        <View style={styles.reconnectingBanner}>
          <Text style={styles.reconnectingText}>Reconnecting...</Text>
        </View>
      )}
      <MessageList
        messages={messages}
        currentUser={user}
        isLoading={isLoading}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        typingUsers={typingUsers}
        onRetry={retryMessage}
      />
      <MessageInput
        conversationId={id}
        members={conversation?.members.filter((m) => m.id !== user?.id) ?? []}
        onSend={sendMessage}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  reconnectingBanner: {
    backgroundColor: "#f59e0b",
    paddingVertical: 6,
    alignItems: "center",
  },
  reconnectingText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
