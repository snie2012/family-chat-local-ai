import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem("auth_token", token);
  } else {
    await SecureStore.setItemAsync("auth_token", token);
  }
}

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem("auth_token");
  }
  return SecureStore.getItemAsync("auth_token");
}

export async function deleteToken(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem("auth_token");
  } else {
    await SecureStore.deleteItemAsync("auth_token");
  }
}
