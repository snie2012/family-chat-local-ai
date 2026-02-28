import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useConversations } from "../../hooks/useConversations";
import { ConversationItem } from "../../components/ConversationItem";
import { useNavigation } from "expo-router";
import { useEffect } from "react";

export default function ConversationsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { conversations, isLoading, refresh } = useConversations();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 8, marginRight: 4 }}>
          {user?.isAdmin && (
            <TouchableOpacity
              onPress={() => router.push("/(app)/admin-settings")}
              style={styles.headerBtn}
            >
              <Ionicons name="settings-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push("/(app)/new-chat")}
            style={styles.headerBtn}
          >
            <Ionicons name="create-outline" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.headerBtn}>
            <Ionicons name="log-out-outline" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
      ),
      headerLeft: () => (
        <View style={styles.headerLeft}>
          <View style={[styles.avatar, { backgroundColor: user?.avatarColor ?? "#6b7280" }]}>
            <Text style={styles.avatarText}>
              {user?.displayName?.[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text style={styles.headerName}>{user?.displayName}</Text>
        </View>
      ),
    });
  }, [user, logout]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the pencil icon to start a chat
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              currentUser={user}
              onPress={() =>
                router.push({
                  pathname: "/(app)/conversation/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
          onRefresh={refresh}
          refreshing={isLoading}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerBtn: {
    padding: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  headerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingBottom: 80,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
});
