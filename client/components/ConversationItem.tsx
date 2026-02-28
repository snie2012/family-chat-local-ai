import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Conversation, User } from "../types";

interface Props {
  conversation: Conversation;
  currentUser: User | null;
  onPress: () => void;
}

function getConversationName(conv: Conversation, currentUser: User | null): string {
  if (conv.name) return conv.name;
  if (conv.isGroup) return "Group Chat";
  const other = conv.members.find((m) => m.id !== currentUser?.id);
  return other?.displayName ?? "Unknown";
}

function getAvatar(conv: Conversation, currentUser: User | null): { initials: string; color: string } {
  const other = conv.members.find((m) => m.id !== currentUser?.id);
  const name = getConversationName(conv, currentUser);
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return {
    initials,
    color: other?.avatarColor ?? "#6b7280",
  };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationItem({ conversation, currentUser, onPress }: Props) {
  const name = getConversationName(conversation, currentUser);
  const avatar = getAvatar(conversation, currentUser);
  const lastMsg = conversation.lastMessage;

  const preview = lastMsg
    ? lastMsg.sender.isBot
      ? `🤖 ${lastMsg.body.slice(0, 50)}${lastMsg.body.length > 50 ? "..." : ""}`
      : `${lastMsg.sender.id === currentUser?.id ? "You: " : ""}${lastMsg.body.slice(0, 50)}${lastMsg.body.length > 50 ? "..." : ""}`
    : "No messages yet";

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.avatar, { backgroundColor: avatar.color }]}>
        {conversation.isGroup ? (
          <Text style={styles.avatarText}>👥</Text>
        ) : (
          <Text style={styles.avatarText}>{avatar.initials}</Text>
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          {lastMsg && (
            <Text style={styles.time}>{formatTime(lastMsg.createdAt)}</Text>
          )}
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {preview}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: "#9ca3af",
    marginLeft: 8,
  },
  preview: {
    fontSize: 13,
    color: "#6b7280",
  },
});
