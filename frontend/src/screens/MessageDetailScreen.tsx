/**
 * Message Detail Screen - Displays messages in a conversation
 */

import React, { useState } from "react";
import {
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
import { colors, spacing } from "../theme";
import { RootStackParamList } from "../types";

type MessageDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "MessageDetail"
>;

type MessageDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  "MessageDetail"
>;

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  isOwn: boolean;
}

// Fake data
const getFakeMessages = (conversationId: string): Message[] => {
  const messages: Message[] = [
    {
      id: "1",
      text: "Hey! Are we still on for the cleanup this weekend?",
      senderId: "other",
      senderName: "John Doe",
      timestamp: "10:25 AM",
      isOwn: false,
    },
    {
      id: "2",
      text: "Yes, absolutely! Looking forward to it.",
      senderId: "me",
      senderName: "You",
      timestamp: "10:26 AM",
      isOwn: true,
    },
    {
      id: "3",
      text: "Great! I'll bring some extra trash bags and gloves.",
      senderId: "other",
      senderName: "John Doe",
      timestamp: "10:27 AM",
      isOwn: false,
    },
    {
      id: "4",
      text: "Perfect, thanks! See you Saturday at 9 AM.",
      senderId: "me",
      senderName: "You",
      timestamp: "10:28 AM",
      isOwn: true,
    },
    {
      id: "5",
      text: "Sounds good! See you there!",
      senderId: "other",
      senderName: "John Doe",
      timestamp: "10:30 AM",
      isOwn: false,
    },
  ];
  return messages;
};

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
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
        {message.text}
      </Text>
      <Text
        variant="caption"
        color={message.isOwn ? "textInverse" : "textTertiary"}
        style={styles.timestamp}
      >
        {message.timestamp}
      </Text>
    </View>
  );
};

export const MessageDetailScreen: React.FC = () => {
  const route = useRoute<MessageDetailScreenRouteProp>();
  const navigation = useNavigation<MessageDetailScreenNavigationProp>();
  const { conversationId, title } = route.params;

  const [messages] = useState<Message[]>(getFakeMessages(conversationId));
  const [inputText, setInputText] = useState("");

  const handleSend = () => {
    if (inputText.trim()) {
      // In real app, this would send the message
      setInputText("");
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
    padding: spacing.md,
    paddingBottom: spacing.lg,
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
