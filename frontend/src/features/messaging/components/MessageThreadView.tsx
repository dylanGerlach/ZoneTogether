import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { Text } from "../../../components";
import { useAuthContext } from "../../../context/AuthContext";
import { useMessageContext } from "../../../context/MessageContext";
import { colors, spacing } from "../../../theme";
import type { Message as ApiMessage, MessageVM, UUID } from "../../../types";
import { EMOJI_TAGS } from "../emojiTags";

type MessageThreadViewProps = {
  conversationId: UUID;
  onGridChipPress?: (cell: string) => void;
  style?: ViewStyle;
  // When true, the list area is allowed to flex to fill its parent. Otherwise
  // the list renders with a bounded default height so the component can be
  // embedded inside another scrollable screen.
  fillParent?: boolean;
};

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

const SystemMessageRow: React.FC<{ message: MessageVM }> = ({ message }) => {
  const kind = message.kind ?? "text";
  const actor = message.isOwn
    ? "You"
    : (message.profile_full_name ?? "Someone");
  const iconName = kind === "system_leave" ? "account-minus" : "account-plus";
  const verb = kind === "system_leave" ? "left" : "joined";
  return (
    <View style={styles.systemRow}>
      <View style={styles.systemPill}>
        <MaterialCommunityIcons
          name={iconName}
          size={14}
          color={colors.textSecondary}
        />
        <Text
          variant="caption"
          color="textSecondary"
          style={styles.systemPillLabel}
        >
          {actor} {verb} the chat
        </Text>
      </View>
    </View>
  );
};

const MessageBubble: React.FC<{
  message: MessageVM;
  onPressGridChip?: (cell: string) => void;
}> = ({ message, onPressGridChip }) => {
  const cell = message.h3_cell ?? null;
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
      {cell ? (
        <TouchableOpacity
          onPress={() => onPressGridChip?.(cell)}
          disabled={!onPressGridChip}
          activeOpacity={0.8}
          style={[
            styles.gridChip,
            message.isOwn ? styles.gridChipOwn : styles.gridChipOther,
          ]}
        >
          <MaterialCommunityIcons
            name="map-marker"
            size={14}
            color={message.isOwn ? colors.white : colors.primary}
          />
          <Text
            variant="caption"
            color={message.isOwn ? "white" : "primary"}
            style={styles.gridChipLabel}
          >
            View on Map
          </Text>
        </TouchableOpacity>
      ) : null}
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

export const MessageThreadView: React.FC<MessageThreadViewProps> = ({
  conversationId,
  onGridChipPress,
  style,
  fillParent = false,
}) => {
  const { session, user } = useAuthContext();
  const {
    getMessages,
    messagesLoadingBySession,
    messagesErrorBySession,
    sendingBySession,
    loadMessagesForSession,
    sendMessage,
  } = useMessageContext();

  const [inputText, setInputText] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const rawMessages = getMessages(conversationId);
  const messages = useMemo<MessageVM[]>(
    () => rawMessages.map((message) => mapApiMessageToVM(message, user?.id)),
    [rawMessages, user?.id],
  );

  const loading = messagesLoadingBySession[conversationId] ?? false;
  const sending = sendingBySession[conversationId] ?? false;
  const error = messagesErrorBySession[conversationId] ?? null;

  useEffect(() => {
    if (!session) return;
    void loadMessagesForSession(session, conversationId);
  }, [conversationId, loadMessagesForSession, session]);

  const canSend = Boolean(session) && inputText.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!session || !canSend) return;
    const content = inputText.trim();
    const created = await sendMessage(session, conversationId, content);
    if (created) {
      setInputText("");
      setEmojiPickerOpen(false);
    }
  };

  const handleEmojiPress = (emoji: string) => {
    setInputText((prev) => {
      if (!prev) return emoji;
      // Insert a space between the prior content and the emoji so consecutive
      // taps/tokens remain readable.
      const needsSpace = !prev.endsWith(" ");
      return `${prev}${needsSpace ? " " : ""}${emoji}`;
    });
  };

  return (
    <View
      style={[
        styles.container,
        fillParent ? styles.containerFill : styles.containerBounded,
        style,
      ]}
    >
      {loading && messages.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="body" color="textSecondary" style={styles.loadingText}>
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
        renderItem={({ item }) => {
          if (item.kind === "system_join" || item.kind === "system_leave") {
            return <SystemMessageRow message={item} />;
          }
          return (
            <View
              style={[
                styles.messageContainer,
                item.isOwn
                  ? styles.ownMessageContainer
                  : styles.otherMessageContainer,
              ]}
            >
              <MessageBubble
                message={item}
                onPressGridChip={onGridChipPress}
              />
            </View>
          );
        }}
        contentContainerStyle={styles.messagesList}
        style={styles.messagesFlatList}
        inverted={false}
      />

      <View style={styles.inputContainer}>
        {emojiPickerOpen ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.emojiRow}
            style={styles.emojiRowScroll}
          >
            {EMOJI_TAGS.map(({ emoji, label }) => (
              <Pressable
                key={emoji}
                onPress={() => handleEmojiPress(emoji)}
                accessibilityRole="button"
                accessibilityLabel={`Insert ${label} emoji`}
                style={styles.emojiChip}
              >
                <Text variant="body" style={styles.emojiGlyph}>
                  {emoji}
                </Text>
                <Text variant="caption" color="textSecondary">
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <View style={styles.inputWrapper}>
          <TouchableOpacity
            onPress={() => setEmojiPickerOpen((prev) => !prev)}
            style={styles.emojiToggleButton}
            accessibilityRole="button"
            accessibilityLabel={
              emojiPickerOpen ? "Hide emoji picker" : "Show emoji picker"
            }
            accessibilityState={{ expanded: emojiPickerOpen }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name={emojiPickerOpen ? "close" : "emoticon-happy-outline"}
              size={22}
              color={emojiPickerOpen ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Message"
            placeholderTextColor={colors.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            underlineColorAndroid="transparent"
            blurOnSubmit={false}
            returnKeyType="send"
            onSubmitEditing={() => void handleSend()}
          />
          <TouchableOpacity
            onPress={() => void handleSend()}
            style={[
              styles.sendButton,
              canSend ? styles.sendButtonActive : styles.sendButtonDisabled,
            ]}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend, busy: sending }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <MaterialCommunityIcons
                name="send"
                size={18}
                color={colors.white}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  containerFill: {
    flex: 1,
  },
  containerBounded: {
    height: 440,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  messagesFlatList: {
    flex: 1,
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
  gridChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    marginBottom: spacing.xs,
  },
  gridChipOwn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  gridChipOther: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  gridChipLabel: {
    fontWeight: "600",
  },
  systemRow: {
    alignItems: "center",
    marginVertical: spacing.sm,
  },
  systemPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  systemPillLabel: {
    fontStyle: "italic",
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
    borderRadius: 24,
    backgroundColor: colors.backgroundSecondary,
    minHeight: 48,
    paddingLeft: spacing.xs,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderWidth: 0,
  },
  emojiRowScroll: {
    marginBottom: spacing.xs,
  },
  emojiRow: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  emojiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  emojiGlyph: {
    fontSize: 18,
  },
  emojiToggleButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
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
    // Kill the default blue focus outline on web.
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
  },
  sendButtonActive: {
    backgroundColor: colors.primary,
  },
  sendButtonDisabled: {
    backgroundColor: colors.gray300,
  },
});
