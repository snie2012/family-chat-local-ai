import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, Pressable } from "react-native";
import { Message, User } from "../types";
import { useTheme, Theme } from "../contexts/ThemeContext";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "👏"];

function renderWithMentions(body: string, isOwn: boolean, theme: Theme) {
  // Split on @Word (including spaces in display names via non-greedy match)
  const parts = body.split(/(@\S+(?:\s\S+)*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <Text key={i} style={{ color: isOwn ? theme.mentionOwnText : theme.mentionOtherText, fontWeight: "700" }}>
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
  onRetry?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, currentUser, showSenderName, onRetry, onReact }: Props) {
  const theme = useTheme();
  const isOwn = message.senderId === currentUser?.id;
  const isBot = message.sender.isBot;
  const [thinkExpanded, setThinkExpanded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Group reactions by emoji
  const reactionGroups: Record<string, string[]> = {};
  for (const r of message.reactions ?? []) {
    if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = [];
    reactionGroups[r.emoji].push(r.userId);
  }
  const hasReactions = Object.keys(reactionGroups).length > 0;

  const hasThinking = isBot && ((message.thinkingBody ?? "").length > 0);

  const bubbleBg = isOwn ? theme.ownBubble : isBot ? theme.botBubble : theme.otherBubble;
  const bubbleStyle = [styles.bubble, { backgroundColor: bubbleBg, opacity: message.isPending ? 0.7 : 1 }];
  const bodyColor = isOwn ? theme.ownBubbleText : theme.otherBubbleText;
  const textStyle = [styles.bodyText, { color: bodyColor }];

  const statusLabel = message.isFailed
    ? "Failed"
    : message.isPending
    ? "Sending..."
    : message.isThinking
    ? "thinking..."
    : message.isStreaming
    ? "typing..."
    : formatTime(message.createdAt);

  return (
    <View style={[styles.row, isOwn ? styles.rowRight : styles.rowLeft]}>
      <View style={styles.bubbleWrapper}>
        {showSenderName && !isOwn && (
          <Text style={[styles.senderName, { color: theme.textSecondary }, isBot && { color: theme.botName }]}>
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
            <Text style={[styles.thinkHeaderText, { color: theme.thinkingHeader }]}>
              {message.isThinking ? "⟳ Thinking..." : `${thinkExpanded ? "▾" : "▸"} Reasoning`}
            </Text>
          </TouchableOpacity>
        )}
        {hasThinking && thinkExpanded && (
          <View style={[styles.thinkBlock, { backgroundColor: theme.thinkingBlock, borderLeftColor: theme.thinkingBorder }]}>
            <Text style={[styles.thinkText, { color: theme.thinkingText }]}>{message.thinkingBody}</Text>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={1}
          onLongPress={() => !message.isPending && !message.isFailed && setShowPicker(true)}
          delayLongPress={400}
        >
          <View style={bubbleStyle}>
            {/* Show a subtle placeholder while only thinking tokens have arrived */}
            {message.isThinking && message.body === "" ? (
              <Text style={[textStyle, { color: theme.textMuted }]}>
                {"  "}
                <Text style={styles.cursor}>▊</Text>
              </Text>
            ) : (
              <Text style={textStyle}>
                {renderWithMentions(message.body, isOwn, theme)}
                {message.isStreaming && !message.isThinking ? (
                  <Text style={styles.cursor}>▊</Text>
                ) : null}
              </Text>
            )}
            <View style={styles.timestampRow}>
              {message.isPending && (
                <ActivityIndicator size={10} color={theme.ownTimestamp} style={styles.pendingSpinner} />
              )}
              <Text style={[styles.timestamp, { color: isOwn ? theme.ownTimestamp : theme.otherTimestamp }, message.isFailed && styles.failedTimestamp]}>
                {statusLabel}
              </Text>
              {message.isFailed && (
                <TouchableOpacity onPress={() => onRetry?.(message.id)} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Reaction badges */}
        {hasReactions && (
          <View style={[styles.reactionsRow, isOwn && styles.reactionsRowRight]}>
            {Object.entries(reactionGroups).map(([emoji, userIds]) => {
              const iMine = userIds.includes(currentUser?.id ?? "");
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.reactionBadge, { backgroundColor: theme.surface, borderColor: iMine ? theme.primary : theme.border }]}
                  onPress={() => onReact?.(message.id, emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {userIds.length > 1 && (
                    <Text style={[styles.reactionCount, { color: iMine ? theme.primary : theme.textSecondary }]}>
                      {userIds.length}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Emoji picker modal */}
      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setShowPicker(false)}>
          <View style={[styles.pickerRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {QUICK_REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.pickerEmojiBtn}
                onPress={() => { onReact?.(message.id, emoji); setShowPicker(false); }}
              >
                <Text style={styles.pickerEmojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  bodyText: {
    fontSize: 15,
    lineHeight: 20,
  },
  cursor: {
    opacity: 0.7,
  },
  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 2,
    gap: 4,
  },
  pendingSpinner: {
    marginRight: 2,
  },
  timestamp: {
    fontSize: 10,
  },
  ownTimestamp: {
    color: "rgba(255,255,255,0.7)",
  },
  otherTimestamp: {
    color: "#9ca3af",
  },
  failedTimestamp: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  retryBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 8,
  },
  retryText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
    marginLeft: 4,
  },
  reactionsRowRight: {
    justifyContent: "flex-end",
  },
  reactionBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerRow: {
    flexDirection: "row",
    borderRadius: 24,
    borderWidth: 1,
    padding: 8,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  pickerEmojiBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  pickerEmojiText: {
    fontSize: 24,
  },
});
