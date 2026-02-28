import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Message, User } from "../types";

function renderWithMentions(body: string, isOwn: boolean) {
  // Split on @Word (including spaces in display names via non-greedy match)
  const parts = body.split(/(@\S+(?:\s\S+)*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <Text key={i} style={isOwn ? styles.mentionOwn : styles.mentionOther}>
          {part}
        </Text>
      );
    }
    return <Text key={i}>{part}</Text>;
  });
}

interface Props {
  message: Message;
  currentUser: User | null;
  showSenderName: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, currentUser, showSenderName }: Props) {
  const isOwn = message.senderId === currentUser?.id;
  const isBot = message.sender.isBot;
  const [thinkExpanded, setThinkExpanded] = useState(false);

  const hasThinking = isBot && ((message.thinkingBody ?? "").length > 0);

  const bubbleStyle = [
    styles.bubble,
    isOwn ? styles.ownBubble : isBot ? styles.botBubble : styles.otherBubble,
  ];

  const textStyle = [
    styles.bodyText,
    isOwn ? styles.ownText : styles.otherText,
  ];

  const statusLabel = message.isThinking
    ? "thinking..."
    : message.isStreaming
    ? "typing..."
    : formatTime(message.createdAt);

  return (
    <View style={[styles.row, isOwn ? styles.rowRight : styles.rowLeft]}>
      <View style={styles.bubbleWrapper}>
        {showSenderName && !isOwn && (
          <Text style={[styles.senderName, isBot && styles.botName]}>
            {isBot ? "🤖 " : ""}{message.sender.displayName}
          </Text>
        )}

        {/* Thinking block — only for bot messages with thinking content */}
        {hasThinking && (
          <TouchableOpacity
            onPress={() => setThinkExpanded((v) => !v)}
            style={styles.thinkHeader}
            activeOpacity={0.7}
          >
            <Text style={styles.thinkHeaderText}>
              {message.isThinking ? "⟳ Thinking..." : `${thinkExpanded ? "▾" : "▸"} Reasoning`}
            </Text>
          </TouchableOpacity>
        )}
        {hasThinking && thinkExpanded && (
          <View style={styles.thinkBlock}>
            <Text style={styles.thinkText}>{message.thinkingBody}</Text>
          </View>
        )}

        <View style={bubbleStyle}>
          {/* Show a subtle placeholder while only thinking tokens have arrived */}
          {message.isThinking && message.body === "" ? (
            <Text style={[textStyle, styles.thinkingPlaceholder]}>
              {"  "}
              <Text style={styles.cursor}>▊</Text>
            </Text>
          ) : (
            <Text style={textStyle}>
              {renderWithMentions(message.body, isOwn)}
              {message.isStreaming && !message.isThinking ? (
                <Text style={styles.cursor}>▊</Text>
              ) : null}
            </Text>
          )}
          <Text style={[styles.timestamp, isOwn ? styles.ownTimestamp : styles.otherTimestamp]}>
            {statusLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 3,
    paddingHorizontal: 12,
  },
  rowLeft: {
    alignItems: "flex-start",
  },
  rowRight: {
    alignItems: "flex-end",
  },
  bubbleWrapper: {
    maxWidth: "80%",
  },
  senderName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 2,
    marginLeft: 4,
  },
  botName: {
    color: "#6366f1",
  },
  thinkHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  thinkHeaderText: {
    fontSize: 11,
    color: "#8b5cf6",
    fontWeight: "600",
  },
  thinkBlock: {
    backgroundColor: "#f5f3ff",
    borderLeftWidth: 2,
    borderLeftColor: "#8b5cf6",
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
  },
  thinkText: {
    fontSize: 12,
    color: "#4b5563",
    lineHeight: 17,
    fontStyle: "italic",
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    paddingBottom: 4,
  },
  ownBubble: {
    backgroundColor: "#3b82f6",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#f3f4f6",
    borderBottomLeftRadius: 4,
  },
  botBubble: {
    backgroundColor: "#ede9fe",
    borderBottomLeftRadius: 4,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownText: {
    color: "#ffffff",
  },
  otherText: {
    color: "#111827",
  },
  thinkingPlaceholder: {
    color: "#9ca3af",
  },
  cursor: {
    opacity: 0.7,
  },
  mentionOwn: {
    color: "#bfdbfe",
    fontWeight: "700",
  },
  mentionOther: {
    color: "#2563eb",
    fontWeight: "700",
  },
  timestamp: {
    fontSize: 10,
    marginTop: 2,
    alignSelf: "flex-end",
  },
  ownTimestamp: {
    color: "rgba(255,255,255,0.7)",
  },
  otherTimestamp: {
    color: "#9ca3af",
  },
});
