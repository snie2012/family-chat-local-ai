import React, { useEffect } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { markAsRead } from "../../../lib/storage";
import { useAuth } from "../../../contexts/AuthContext";
import { useMessages } from "../../../hooks/useMessages";
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
  const navigation = useNavigation();

  const [conversation, setConversation] = React.useState<Conversation | null>(null);

  const {
    messages,
    isLoading,
    isFetchingMore,
    hasMore,
    sendMessage,
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
      <MessageList
        messages={messages}
        currentUser={user}
        isLoading={isLoading}
        isFetchingMore={isFetchingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        typingUsers={typingUsers}
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
});
