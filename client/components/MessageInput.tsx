import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Text,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSocket } from "../contexts/SocketContext";
import { useTheme } from "../contexts/ThemeContext";
import { User } from "../types";

interface Props {
  conversationId: string;
  members?: User[];
  onSend: (body: string) => void;
}

export function MessageInput({ conversationId, members = [], onSend }: Props) {
  const [text, setText] = useState("");
  const { socket } = useSocket();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const typingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);

  const filteredMembers = mentionQuery !== null
    ? members.filter((m) =>
        m.displayName.toLowerCase().startsWith(mentionQuery.toLowerCase()) ||
        m.username.toLowerCase().startsWith(mentionQuery.toLowerCase())
      )
    : [];

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
    setMentionQuery(null);
    handleStopTyping();
  };

  const handleStartTyping = () => {
    if (!typingRef.current) {
      typingRef.current = true;
      socket?.emit("typing_start", { conversationId });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(handleStopTyping, 2000);
  };

  const handleStopTyping = () => {
    if (typingRef.current) {
      typingRef.current = false;
      socket?.emit("typing_stop", { conversationId });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleChangeText = (t: string) => {
    setText(t);
    if (t.length > 0) handleStartTyping();
    else handleStopTyping();

    // Detect @mention trigger: find last @ before cursor
    const atIdx = t.lastIndexOf("@");
    if (atIdx !== -1) {
      const afterAt = t.slice(atIdx + 1);
      // Only trigger if after @ there's no space (still typing the name)
      if (!afterAt.includes(" ") && members.length > 0) {
        setMentionQuery(afterAt);
        setMentionStart(atIdx);
        return;
      }
    }
    setMentionQuery(null);
  };

  const insertMention = (member: User) => {
    const before = text.slice(0, mentionStart);
    const after = text.slice(mentionStart + 1 + (mentionQuery?.length ?? 0));
    const newText = `${before}@${member.displayName}${after.startsWith(" ") ? "" : " "}${after}`;
    setText(newText);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: { nativeEvent: { key: string; shiftKey?: boolean } }) => {
    if (Platform.OS === "web" && e.nativeEvent.key === "Enter" && !e.nativeEvent.shiftKey) {
      handleSend();
    }
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom, backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      {/* @mention suggestions */}
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <View style={[styles.mentionList, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <FlatList
            data={filteredMembers}
            keyExtractor={(u) => u.id}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.mentionItem, { borderBottomColor: theme.borderLight }]}
                onPress={() => insertMention(item)}
              >
                <View style={[styles.mentionAvatar, { backgroundColor: item.avatarColor ?? "#6b7280" }]}>
                  {item.isBot
                    ? <Text style={styles.mentionAvatarText}>🤖</Text>
                    : <Text style={styles.mentionAvatarText}>{item.displayName[0].toUpperCase()}</Text>
                  }
                </View>
                <View>
                  <Text style={[styles.mentionName, { color: theme.text }]}>{item.displayName}</Text>
                  <Text style={[styles.mentionUsername, { color: theme.textMuted }]}>
                    {item.isBot ? "AI Assistant" : `@${item.username}`}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.container}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText }]}
          value={text}
          onChangeText={handleChangeText}
          placeholder="Message..."
          placeholderTextColor={theme.placeholder}
          multiline
          maxLength={4000}
          onKeyPress={handleKeyPress}
          onBlur={handleStopTyping}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: text.trim() ? theme.sendBtn : theme.sendBtnDisabled }]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Ionicons name="send" size={20} color={text.trim() ? "#fff" : theme.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
  },
  mentionList: {
    maxHeight: 180,
    borderBottomWidth: 1,
  },
  mentionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  mentionAvatarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  mentionName: { fontSize: 14, fontWeight: "600" },
  mentionUsername: { fontSize: 12 },
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } as Record<string, unknown> : {}),
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
