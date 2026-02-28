import React, { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, StyleSheet, FlatList, Platform } from "react-native";
import { Message, User } from "../types";
import { MessageBubble } from "./MessageBubble";

type DateSeparator = { __sep: true; id: string; label: string };
type ListItem = Message | DateSeparator;

function isSeparator(item: ListItem): item is DateSeparator {
  return "__sep" in item;
}

function formatDateLabel(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

function buildListItems(messages: Message[]): ListItem[] {
  const result: ListItem[] = [];
  let lastDate = "";
  for (const msg of messages) {
    const dateStr = new Date(msg.createdAt).toDateString();
    if (dateStr !== lastDate) {
      result.push({ __sep: true, id: `sep-${dateStr}`, label: formatDateLabel(new Date(msg.createdAt)) });
      lastDate = dateStr;
    }
    result.push(msg);
  }
  return result;
}

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
  const listItems = buildListItems(messages);

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

  const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
    if (isSeparator(item)) {
      return (
        <View style={styles.separatorRow}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorLabel}>{item.label}</Text>
          <View style={styles.separatorLine} />
        </View>
      );
    }
    const prevItem = listItems[index - 1];
    const prevMsg = prevItem && !isSeparator(prevItem) ? prevItem : undefined;
    const showSenderName = !prevMsg || prevMsg.senderId !== item.senderId;
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
      data={listItems}
      keyExtractor={(item) => (isSeparator(item) ? item.id : item.id)}
      renderItem={renderItem}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.1}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={Platform.OS !== "web"}
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
    paddingTop: 8,
    paddingBottom: 16,
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
  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  separatorLabel: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
  },
});
