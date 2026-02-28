export const lightTheme = {
  // Backgrounds
  background: "#f9fafb",
  surface: "#ffffff",
  surfaceSecondary: "#f3f4f6",
  // Text
  text: "#111827",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  // Borders
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
  // Brand
  primary: "#3b82f6",
  // Chat bubbles
  ownBubble: "#3b82f6",
  ownBubbleText: "#ffffff",
  ownTimestamp: "rgba(255,255,255,0.7)",
  otherBubble: "#f3f4f6",
  otherBubbleText: "#111827",
  otherTimestamp: "#9ca3af",
  botBubble: "#ede9fe",
  botName: "#6366f1",
  // Thinking block
  thinkingHeader: "#8b5cf6",
  thinkingBlock: "#f5f3ff",
  thinkingBorder: "#8b5cf6",
  thinkingText: "#4b5563",
  // Mention
  mentionOwnText: "#bfdbfe",
  mentionOtherText: "#2563eb",
  // Input
  inputBackground: "#f3f4f6",
  inputText: "#111827",
  placeholder: "#9ca3af",
  // Send button
  sendBtn: "#3b82f6",
  sendBtnDisabled: "#e5e7eb",
  // Unread dot
  unreadDot: "#3b82f6",
  // Date separator
  separatorLine: "#e5e7eb",
  separatorText: "#9ca3af",
};

export const darkTheme: typeof lightTheme = {
  // Backgrounds
  background: "#111827",
  surface: "#1f2937",
  surfaceSecondary: "#374151",
  // Text
  text: "#f9fafb",
  textSecondary: "#9ca3af",
  textMuted: "#6b7280",
  // Borders
  border: "#374151",
  borderLight: "#2d3748",
  // Brand
  primary: "#60a5fa",
  // Chat bubbles
  ownBubble: "#2563eb",
  ownBubbleText: "#ffffff",
  ownTimestamp: "rgba(255,255,255,0.6)",
  otherBubble: "#374151",
  otherBubbleText: "#f9fafb",
  otherTimestamp: "#9ca3af",
  botBubble: "#1e1b4b",
  botName: "#a5b4fc",
  // Thinking block
  thinkingHeader: "#a78bfa",
  thinkingBlock: "#1e1b4b",
  thinkingBorder: "#7c3aed",
  thinkingText: "#c4b5fd",
  // Mention
  mentionOwnText: "#93c5fd",
  mentionOtherText: "#60a5fa",
  // Input
  inputBackground: "#374151",
  inputText: "#f9fafb",
  placeholder: "#6b7280",
  // Send button
  sendBtn: "#2563eb",
  sendBtnDisabled: "#374151",
  // Unread dot
  unreadDot: "#60a5fa",
  // Date separator
  separatorLine: "#374151",
  separatorText: "#6b7280",
};

export type Theme = typeof lightTheme;
