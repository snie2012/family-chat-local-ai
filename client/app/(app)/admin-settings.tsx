import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../lib/api";
import { useTheme } from "../../contexts/ThemeContext";
import { User } from "../../types";

interface BotSettings {
  thinkMode: boolean;
  model: string;
  systemPrompt: string;
}

export default function AdminSettingsScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Member management
  const [members, setMembers] = useState<User[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadMembers = () => {
    api.get("/users").then((res) => {
      setMembers(res.data.filter((u: User) => !u.isBot));
    });
  };

  useEffect(() => {
    navigation.setOptions({
      title: "Bot Settings",
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} disabled={isSaving} style={{ marginRight: 8 }}>
          {isSaving ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Text style={{ color: "#3b82f6", fontSize: 16, fontWeight: "600" }}>
              {saved ? "Saved ✓" : "Save"}
            </Text>
          )}
        </TouchableOpacity>
      ),
    });
  }, [settings, isSaving, saved]);

  useEffect(() => {
    api.get("/settings/bot").then((res) => {
      setSettings(res.data);
      setIsLoading(false);
    });
    loadMembers();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    setSaved(false);
    try {
      await api.patch("/settings/bot", settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateMember = async () => {
    if (!newUsername.trim() || !newDisplayName.trim() || !newPassword.trim()) return;
    setIsCreating(true);
    try {
      await api.post("/auth/register", {
        username: newUsername.trim().toLowerCase(),
        displayName: newDisplayName.trim(),
        password: newPassword.trim(),
      });
      setNewUsername("");
      setNewDisplayName("");
      setNewPassword("");
      loadMembers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to create member";
      Alert.alert("Error", msg);
    } finally {
      setIsCreating(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }];

  if (isLoading || !settings) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
      {/* Think Mode */}
      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>REASONING</Text>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={[styles.label, { color: theme.text }]}>Think Mode</Text>
            <Text style={[styles.sublabel, { color: theme.textSecondary }]}>
              Chain-of-thought reasoning before responding.{"\n"}
              Supported by: qwen3, deepseek-r1, and others.{"\n"}
              Thinking process is shown in chat. Slower but more accurate.
            </Text>
          </View>
          <Switch
            value={settings.thinkMode}
            onValueChange={(v) => { setSettings({ ...settings, thinkMode: v }); setSaved(false); }}
            trackColor={{ true: theme.primary, false: theme.border }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Model */}
      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>MODEL</Text>
        <View style={styles.fieldRow}>
          <Text style={[styles.label, { color: theme.text }]}>Ollama model name</Text>
          <TextInput
            style={inputStyle}
            value={settings.model}
            onChangeText={(v) => { setSettings({ ...settings, model: v }); setSaved(false); }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="e.g. qwen3:4b, llama3.2, mistral"
            placeholderTextColor={theme.placeholder}
          />
        </View>
      </View>

      {/* System Prompt */}
      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>SYSTEM PROMPT</Text>
        <TextInput
          style={[...inputStyle, styles.promptInput]}
          value={settings.systemPrompt}
          onChangeText={(v) => { setSettings({ ...settings, systemPrompt: v }); setSaved(false); }}
          multiline
          placeholder="System prompt for the AI assistant..."
          placeholderTextColor={theme.placeholder}
        />
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: theme.primary }, isSaving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>{saved ? "Saved ✓" : "Save Settings"}</Text>
        )}
      </TouchableOpacity>

      {/* Members */}
      <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>MEMBERS</Text>
        {members.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <View style={[styles.memberAvatar, { backgroundColor: m.avatarColor ?? "#6b7280" }]}>
              <Text style={styles.memberAvatarText}>{m.displayName[0].toUpperCase()}</Text>
            </View>
            <View>
              <Text style={[styles.label, { color: theme.text }]}>{m.displayName}</Text>
              <Text style={[styles.sublabel, { color: theme.textSecondary }]}>@{m.username}{m.isAdmin ? " · admin" : ""}</Text>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 8, color: theme.textMuted }]}>ADD MEMBER</Text>
        <TextInput style={inputStyle} placeholder="Username (lowercase, no spaces)" value={newUsername} onChangeText={setNewUsername} autoCapitalize="none" autoCorrect={false} placeholderTextColor={theme.placeholder} />
        <TextInput style={inputStyle} placeholder="Display name" value={newDisplayName} onChangeText={setNewDisplayName} placeholderTextColor={theme.placeholder} />
        <TextInput style={inputStyle} placeholder="Password (min 8 chars)" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholderTextColor={theme.placeholder} />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary }, (!newUsername || !newDisplayName || !newPassword || isCreating) && { opacity: 0.5 }]}
          onPress={handleCreateMember}
          disabled={!newUsername || !newDisplayName || !newPassword || isCreating}
        >
          {isCreating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Member</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, gap: 16 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowText: { flex: 1 },
  fieldRow: { gap: 6 },
  label: { fontSize: 15, fontWeight: "600", color: "#111827" },
  sublabel: { fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 17 },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: "#111827",
    ...(Platform.OS === "web" ? { outlineStyle: "none" } as Record<string, unknown> : {}),
  },
  promptInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  saveBtn: {
    height: 48,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { backgroundColor: "#93c5fd" },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
