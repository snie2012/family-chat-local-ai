import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { SocketProvider } from "../../contexts/SocketContext";
import { ActivityIndicator, View } from "react-native";

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/(auth)/login");
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!user) return null;

  return (
    <SocketProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            title: "Family Chat",
            headerStyle: { backgroundColor: "#fff" },
            headerTitleStyle: { fontWeight: "700" },
            headerShadowVisible: true,
          }}
        />
        <Stack.Screen
          name="conversation/[id]"
          options={{
            headerStyle: { backgroundColor: "#fff" },
            headerTitleStyle: { fontWeight: "600" },
            headerBackTitle: "Chats",
          }}
        />
        <Stack.Screen
          name="new-chat"
          options={{
            title: "New Chat",
            presentation: "modal",
            headerStyle: { backgroundColor: "#fff" },
            headerTitleStyle: { fontWeight: "600" },
          }}
        />
        <Stack.Screen
          name="admin-settings"
          options={{
            title: "Bot Settings",
            presentation: "modal",
            headerStyle: { backgroundColor: "#fff" },
            headerTitleStyle: { fontWeight: "600" },
          }}
        />
      </Stack>
    </SocketProvider>
  );
}
