import React, { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, StyleSheet, FlatList } from "react-native";
import { Message, User } from "../types";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: Message[];
  currentUser: User | null;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  typingUsers: string[];
}

export function MessageList({
  messages,
  currentUser,
  isLoading,
  isFetchingMore,
  hasMore,
  onLoadMore,
  typingUsers,
}: Props) {
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [messages.length, messages[messages.length - 1]?.body]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No messages yet. Say hello!</Text>
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const prevMsg = messages[index - 1];
    const showSenderName =
      !item.sender.isBot
        ? !prevMsg || prevMsg.senderId !== item.senderId
        : !prevMsg || prevMsg.senderId !== item.senderId;

    return (
      <MessageBubble
        message={item}
        currentUser={currentUser}
        showSenderName={showSenderName}
      />
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.1}
      ListHeaderComponent={
        isFetchingMore ? (
          <ActivityIndicator size="small" color="#3b82f6" style={styles.loadingMore} />
        ) : null
      }
      ListFooterComponent={
        typingUsers.length > 0 ? (
          <View style={styles.typingRow}>
            <Text style={styles.typingText}>
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </Text>
          </View>
        ) : null
      }
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 15,
  },
  listContent: {
    paddingVertical: 8,
  },
  loadingMore: {
    padding: 8,
  },
  typingRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingText: {
    color: "#9ca3af",
    fontSize: 12,
    fontStyle: "italic",
  },
});
