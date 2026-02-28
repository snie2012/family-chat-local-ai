import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
  Switch,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { User } from "../../types";

export default function NewChatScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    api.get("/users").then((res) => {
      setUsers(res.data.filter((u: User) => u.id !== currentUser?.id));
      setIsLoading(false);
    });
  }, []);

  // Update header Create button whenever relevant state changes
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleCreate}
          disabled={selected.size === 0 || isCreating || (isGroup && !groupName.trim())}
          style={{ marginRight: 8 }}
        >
          <Text
            style={{
              color: selected.size === 0 || isCreating || (isGroup && !groupName.trim())
                ? "#93c5fd"
                : "#3b82f6",
              fontSize: 16,
              fontWeight: "600",
            }}
          >
            Create
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [selected, isGroup, groupName, isCreating]);

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // When switching to group mode or selecting more than one, enable group toggle
  useEffect(() => {
    if (selected.size > 1) setIsGroup(true);
  }, [selected.size]);

  const handleCreate = async () => {
    if (selected.size === 0) return;
    setIsCreating(true);
    try {
      if (selected.size === 1 && !isGroup) {
        const [otherUserId] = selected;
        // Always POST dm — server will deduplicate for humans, create fresh for bot
        const res = await api.post("/conversations", { type: "dm", otherUserId });
        router.replace({ pathname: "/(app)/conversation/[id]", params: { id: res.data.id } });
      } else {
        const res = await api.post("/conversations", {
          type: "group",
          name: groupName.trim() || "Group Chat",
          memberIds: Array.from(selected),
        });
        router.replace({ pathname: "/(app)/conversation/[id]", params: { id: res.data.id } });
      }
    } catch (err) {
      console.error("Failed to create conversation:", err);
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Group toggle — only shown when 2+ selected or manually enabled */}
      {(isGroup || selected.size > 1) && (
        <>
          <View style={styles.groupToggle}>
            <Text style={styles.groupLabel}>Group chat</Text>
            <Switch
              value={isGroup}
              onValueChange={setIsGroup}
              trackColor={{ true: "#3b82f6" }}
            />
          </View>
          {isGroup && (
            <TextInput
              style={styles.groupNameInput}
              placeholder="Group name..."
              value={groupName}
              onChangeText={setGroupName}
              placeholderTextColor="#9ca3af"
            />
          )}
        </>
      )}

      {selected.size > 0 && (
        <View style={styles.selectedBar}>
          <Text style={styles.selectedText}>{selected.size} selected</Text>
        </View>
      )}

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        ListHeaderComponent={
          <Text style={styles.sectionLabel}>
            {users.some((u) => u.isBot) ? "AI ASSISTANT" : ""}
          </Text>
        }
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          return (
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => toggleUser(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: item.avatarColor ?? "#6b7280" }]}>
                {item.isBot ? (
                  <Text style={styles.avatarText}>🤖</Text>
                ) : (
                  <Text style={styles.avatarText}>
                    {item.displayName[0].toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.displayName}>{item.displayName}</Text>
                <Text style={styles.username}>
                  {item.isBot ? "AI Assistant" : `@${item.username}`}
                </Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  groupToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  groupLabel: { fontSize: 15, color: "#111827" },
  groupNameInput: {
    margin: 12,
    height: 44,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } as Record<string, unknown> : {}),
  },
  selectedBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#eff6ff",
    borderBottomWidth: 1,
    borderBottomColor: "#bfdbfe",
  },
  selectedText: { color: "#2563eb", fontSize: 13, fontWeight: "600" },
  userRow: {
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  userInfo: { flex: 1 },
  displayName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  username: { fontSize: 12, color: "#9ca3af" },
});
