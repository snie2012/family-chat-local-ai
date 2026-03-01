import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { SocketProvider } from "../../contexts/SocketContext";
import { useTheme } from "../../contexts/ThemeContext";
import { registerPushNotifications } from "../../lib/push";
import { ActivityIndicator, View } from "react-native";

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/(auth)/login");
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (user) registerPushNotifications();
  }, [user?.id]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!user) return null;

  const headerStyle = { backgroundColor: theme.surface };
  const headerTitleStyle = { color: theme.text };

  return (
    <SocketProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: "Family Chat",
            headerStyle,
            headerTitleStyle: { ...headerTitleStyle, fontWeight: "700" },
            headerShadowVisible: true,
          }}
        />
        <Stack.Screen
          name="conversation/[id]"
          options={{
            headerStyle,
            headerTitleStyle: { ...headerTitleStyle, fontWeight: "600" },
            headerBackTitle: "Chats",
            headerTintColor: theme.primary,
          }}
        />
        <Stack.Screen
          name="new-chat"
          options={{
            title: "New Chat",
            presentation: "modal",
            headerStyle,
            headerTitleStyle: { ...headerTitleStyle, fontWeight: "600" },
          }}
        />
        <Stack.Screen
          name="admin-settings"
          options={{
            title: "Bot Settings",
            presentation: "modal",
            headerStyle,
            headerTitleStyle: { ...headerTitleStyle, fontWeight: "600" },
          }}
        />
      </Stack>
    </SocketProvider>
  );
}
