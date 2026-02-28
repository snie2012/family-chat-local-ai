import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, FlatList, Platform, TouchableOpacity } from "react-native";
import { Message, User } from "../types";
import { MessageBubble } from "./MessageBubble";
import { useTheme } from "../contexts/ThemeContext";

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
  onRetry: (messageId: string) => void;
}

export function MessageList({
  messages,
  currentUser,
  isLoading,
  isFetchingMore,
  hasMore,
  onLoadMore,
  typingUsers,
  onRetry,
}: Props) {

  const theme = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const listItems = buildListItems(messages);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        setShowScrollButton(false);
      }, 50);
    }
  }, [messages.length, messages[messages.length - 1]?.body]);

  const handleScroll = useCallback(({ nativeEvent }: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    setShowScrollButton(distanceFromBottom > 100);
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (messages.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.emptyText, { color: theme.textMuted }]}>No messages yet. Say hello!</Text>
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
    if (isSeparator(item)) {
      return (
        <View style={styles.separatorRow}>
          <View style={[styles.separatorLine, { backgroundColor: theme.separatorLine }]} />
          <Text style={[styles.separatorLabel, { color: theme.separatorText }]}>{item.label}</Text>
          <View style={[styles.separatorLine, { backgroundColor: theme.separatorLine }]} />
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
        onRetry={onRetry}
      />
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={listItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={hasMore ? onLoadMore : undefined}
        onEndReachedThreshold={0.1}
        onScroll={handleScroll}
        scrollEventThrottle={100}
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
              <Text style={[styles.typingText, { color: theme.textMuted }]}>
                {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      {showScrollButton && (
        <TouchableOpacity
          style={styles.scrollBottomBtn}
          onPress={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
            setShowScrollButton(false);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.scrollBottomIcon}>↓</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  scrollBottomBtn: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollBottomIcon: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
});
