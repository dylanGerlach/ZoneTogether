/**
 * Message List Screen - Displays all conversation threads
 */

import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text } from "../components";
import { colors, spacing } from "../theme";
import { RootStackParamList } from "../types";

type MessageListScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "MessageList"
>;

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  isGroup: boolean;
  unreadCount?: number;
}

// Fake data
const fakeConversations: Conversation[] = [
  {
    id: "1",
    title: "John Doe",
    lastMessage: "Hey, are we still on for the cleanup this weekend?",
    timestamp: "10:30 AM",
    isGroup: false,
    unreadCount: 2,
  },
  {
    id: "2",
    title: "Community Cleanup Group",
    lastMessage: "Sarah: Great work everyone! The park looks amazing.",
    timestamp: "Yesterday",
    isGroup: true,
  },
  {
    id: "3",
    title: "Jane Smith",
    lastMessage: "Thanks for organizing this!",
    timestamp: "Yesterday",
    isGroup: false,
  },
  {
    id: "4",
    title: "Downtown Volunteers",
    lastMessage: "Mike: Can someone bring extra trash bags?",
    timestamp: "2 days ago",
    isGroup: true,
    unreadCount: 5,
  },
  {
    id: "5",
    title: "Alex Johnson",
    lastMessage: "See you there!",
    timestamp: "3 days ago",
    isGroup: false,
  },
  {
    id: "6",
    title: "Beach Cleanup Team",
    lastMessage: "Emma: Weather looks perfect for Saturday!",
    timestamp: "1 week ago",
    isGroup: true,
  },
];

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const ConversationItem: React.FC<{
  conversation: Conversation;
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
            {conversation.timestamp}
          </Text>
        </View>
        <View style={styles.messageRow}>
          <Text
            variant="body"
            color="textSecondary"
            style={styles.lastMessage}
            numberOfLines={1}
          >
            {conversation.lastMessage}
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
  const navigation = useNavigation<MessageListScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return fakeConversations;
    }
    const query = searchQuery.toLowerCase();
    return fakeConversations.filter(
      (conv) =>
        conv.title.toLowerCase().includes(query) ||
        conv.lastMessage.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleConversationPress = (conversation: Conversation) => {
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
          onPress={() => navigation.navigate("Home")}
          style={styles.backButton}
        >
          <Text variant="body" color="primary">
            ← Go back to Home
          </Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text variant="h1" style={styles.headerTitle}>
            Messages
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("NewMessage")}
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
  headerTitle: {
    fontSize: 34,
    fontWeight: "700",
    flex: 1,
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
});
