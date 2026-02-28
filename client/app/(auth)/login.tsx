import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { StatusBar } from "expo-status-bar";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim() || !password) return;
    setIsLoading(true);
    setError("");
    try {
      await login(username.trim(), password);
      router.replace("/(app)");
    } catch {
      setError("Invalid username or password");
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="auto" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.emoji}>💬</Text>
          <Text style={[styles.title, { color: theme.text }]}>Family Chat</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Private chat for family & friends</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={inputStyle}
            placeholder="Username"
            placeholderTextColor={theme.placeholder}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <TextInput
            style={inputStyle}
            placeholder="Password"
            placeholderTextColor={theme.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: theme.primary }, (isLoading || !username.trim() || !password) && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={isLoading || !username.trim() || !password}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  inner: {
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
  },
  form: {
    gap: 12,
  },
  input: {
    height: 52,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111827",
    ...(Platform.OS === "web" ? { outlineStyle: "none" } as Record<string, unknown> : {}),
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    textAlign: "center",
  },
  loginBtn: {
    height: 52,
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  loginBtnDisabled: {
    backgroundColor: "#93c5fd",
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
