/**
 * Message Detail Screen - Displays messages in a conversation
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { Text } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { colors, spacing } from "../theme";
import { Message as ApiMessage } from "../types";
import { MessageVM, RootStackParamList } from "../types";
import { createMessage, fetchSessionMessages } from "../utils/backendApi";

type MessageDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "MessageDetail"
>;

type MessageDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  "MessageDetail"
>;

function mapApiMessageToVM(
  message: ApiMessage,
  currentUserId?: string,
): MessageVM {
  const isOwn = Boolean(currentUserId && message.user_id === currentUserId);
  return {
    ...message,
    senderName: isOwn ? "You" : (message.profile_full_name ?? "Unknown User"),
    isOwn,
  };
}

const MessageBubble: React.FC<{ message: MessageVM }> = ({ message }) => {
  return (
    <View
      style={[
        styles.messageBubble,
        message.isOwn ? styles.ownMessage : styles.otherMessage,
      ]}
    >
      {!message.isOwn && (
        <Text variant="caption" color="textTertiary" style={styles.senderName}>
          {message.senderName}
        </Text>
      )}
      <Text
        variant="body"
        color={message.isOwn ? "white" : "textPrimary"}
        style={styles.messageText}
      >
        {message.message}
      </Text>
      <Text
        variant="caption"
        color={message.isOwn ? "textInverse" : "textTertiary"}
        style={styles.timestamp}
      >
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}
      </Text>
    </View>
  );
};

export const MessageDetailScreen: React.FC = () => {
  const { session, user } = useAuthContext();
  const route = useRoute<MessageDetailScreenRouteProp>();
  const navigation = useNavigation<MessageDetailScreenNavigationProp>();
  const { conversationId, title } = route.params;

  const [messages, setMessages] = useState<MessageVM[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetchSessionMessages(session, conversationId);
      setMessages(
        response.map((message) => mapApiMessageToVM(message, user?.id)),
      );
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load messages right now.";
      setError(message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, session, user?.id]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const handleSend = async () => {
    if (!session || !inputText.trim() || sending) return;

    const content = inputText.trim();
    setSending(true);
    setError(null);
    try {
      const created = await createMessage(session, {
        sessionId: conversationId,
        content,
      });
      setMessages((current) => [
        ...current,
        mapApiMessageToVM(created, user?.id),
      ]);
      setInputText("");
    } catch (sendError) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : "Unable to send message right now.";
      setError(message);
    } finally {
      setSending(false);
    }
  };

  const Container = Platform.OS === "web" ? View : SafeAreaView;
  const containerProps =
    Platform.OS === "web"
      ? { style: styles.container }
      : { style: styles.container, edges: ["top", "bottom"] as const };

  return (
    <Container {...containerProps}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text variant="body" color="primary">
              Back
            </Text>
          </TouchableOpacity>
          <Text variant="h3" style={styles.headerTitle}>
            {title}
          </Text>
          <View style={styles.backButton} />
        </View>

        {loading && messages.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text
              variant="body"
              color="textSecondary"
              style={styles.loadingText}
            >
              Loading messages...
            </Text>
          </View>
        ) : null}

        {error ? (
          <Text variant="caption" color="error" style={styles.errorText}>
            {error}
          </Text>
        ) : null}

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageContainer,
                item.isOwn
                  ? styles.ownMessageContainer
                  : styles.otherMessageContainer,
              ]}
            >
              <MessageBubble message={item} />
            </View>
          )}
          contentContainerStyle={styles.messagesList}
          inverted={false}
        />

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              underlineColorAndroid="transparent"
            />
            {inputText.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleSend}
                style={styles.sendIcon}
                disabled={sending}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text
                  variant="body"
                  color="primary"
                  style={styles.sendIconText}
                >
                  ➤
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    minWidth: 60,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
  },
  messagesList: {
    flexGrow: 1,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  loadingState: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    marginLeft: spacing.sm,
  },
  errorText: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  messageContainer: {
    marginBottom: spacing.sm,
    maxWidth: "80%",
  },
  ownMessageContainer: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  otherMessageContainer: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: 18,
    maxWidth: "100%",
  },
  ownMessage: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: colors.gray200,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    marginBottom: spacing.xs,
    fontSize: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  timestamp: {
    fontSize: 11,
    alignSelf: "flex-end",
  },
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    minHeight: 48,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 0,
  },
  input: {
    flex: 1,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  sendIcon: {
    padding: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  sendIconText: {
    fontSize: 20,
  },
});
