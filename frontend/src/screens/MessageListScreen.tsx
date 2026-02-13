/**
 * Message List Screen - Displays all conversation threads
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { colors, spacing } from "../theme";
import {
  ConversationVM,
  MessageSessionUser,
  RootStackParamList,
} from "../types";
import { fetchUserSessions } from "../utils/backendApi";

type MessageListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "MessageList"
>;
type MessageListScreenRouteProp = RouteProp<RootStackParamList, "MessageList">;

function formatTimestampLabel(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function mapSessionToConversation(
  sessionUser: MessageSessionUser,
): ConversationVM | null {
  if (
    !sessionUser.message_session ||
    typeof sessionUser.message_session === "string"
  ) {
    return null;
  }

  const session = sessionUser.message_session;
  return {
    ...session,
    timestampLabel: formatTimestampLabel(
      session.updated_at ?? session.created_at,
    ),
    isGroup: true,
  };
}

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const ConversationItem: React.FC<{
  conversation: ConversationVM;
  onPress: () => void;
}> = ({ conversation, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text variant="body" color="white" style={styles.avatarText}>
            {getInitials(conversation.title)}
          </Text>
        </View>
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text variant="body" style={styles.title} numberOfLines={1}>
            {conversation.title}
          </Text>
          <Text variant="caption" color="textTertiary" style={styles.timestamp}>
            {conversation.timestampLabel}
          </Text>
        </View>
        <View style={styles.messageRow}>
          <Text
            variant="body"
            color="textSecondary"
            style={styles.lastMessage}
            numberOfLines={1}
          >
            {conversation.last_message_sent ?? ""}
          </Text>
          {conversation.unreadCount && conversation.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text variant="caption" color="white" style={styles.badgeText}>
                {conversation.unreadCount > 99
                  ? "99+"
                  : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const MessageListScreen: React.FC = () => {
  const { session } = useAuthContext();
  const navigation = useNavigation<MessageListScreenNavigationProp>();
  const route = useRoute<MessageListScreenRouteProp>();
  const { organizationId, organizationName } = route.params;
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<ConversationVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);
    try {
      const sessionUsers = await fetchUserSessions(session);
      const mapped = sessionUsers
        .map(mapSessionToConversation)
        .filter((item): item is ConversationVM => item !== null)
        .filter((item) => item.organization_id === organizationId);
      setConversations(mapped);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load conversations right now.";
      setError(message);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [organizationId, session]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations;
    }
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.title.toLowerCase().includes(query) ||
        (conv.last_message_sent ?? "").toLowerCase().includes(query),
    );
  }, [conversations, searchQuery]);

  const handleConversationPress = (conversation: ConversationVM) => {
    navigation.navigate("MessageDetail", {
      conversationId: conversation.id,
      title: conversation.title,
    });
  };

  const Container = Platform.OS === "web" ? View : SafeAreaView;
  const containerProps =
    Platform.OS === "web"
      ? { style: styles.container }
      : { style: styles.container, edges: ["top", "bottom"] as const };

  return (
    <Container {...containerProps}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }
            navigation.navigate("Organization", { organizationId, organizationName });
          }}
          style={styles.backButton}
        >
          <Text variant="body" color="primary">
            ← Organizations
          </Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <View style={styles.headerTitleContainer}>
            <Text variant="h1" style={styles.headerTitle}>
              {organizationName}
            </Text>
            <Text variant="caption" color="textSecondary">
              Messages
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("NewMessage", {
                organizationId,
                organizationName,
              })
            }
            style={styles.newMessageButton}
          >
            <Text
              variant="body"
              color="white"
              style={styles.newMessageButtonText}
            >
              + New
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          placeholder="Search messages..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
        />
      </View>
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            onPress={() => handleConversationPress(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {loading ? (
              <>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  variant="body"
                  color="textSecondary"
                  style={styles.loadingText}
                >
                  Loading conversations...
                </Text>
              </>
            ) : error ? (
              <>
                <Text variant="h3" style={styles.emptyStateTitle}>
                  Couldn't load messages
                </Text>
                <Text
                  variant="body"
                  color="textSecondary"
                  style={styles.emptyStateBody}
                >
                  {error}
                </Text>
              </>
            ) : (
              <>
                <Text variant="h3" style={styles.emptyStateTitle}>
                  No conversations yet
                </Text>
                <Text
                  variant="body"
                  color="textSecondary"
                  style={styles.emptyStateBody}
                >
                  Start your first message thread in this organization.
                </Text>
              </>
            )}
          </View>
        }
      />
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backButton: {
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  newMessageButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  newMessageButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  searchBar: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 48,
    marginTop: 0,
    marginBottom: 0,
  },
  listContent: {
    paddingVertical: spacing.xs,
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 14,
    marginLeft: spacing.sm,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMessage: {
    flex: 1,
    fontSize: 15,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: spacing.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 70,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyStateTitle: {
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  emptyStateBody: {
    textAlign: "center",
  },
  loadingText: {
    marginTop: spacing.sm,
  },
});
