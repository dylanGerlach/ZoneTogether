import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { Text } from "../../../components";
import { useAuthContext } from "../../../context/AuthContext";
import { useMessageContext } from "../../../context/MessageContext";
import { colors, radii, spacing } from "../../../theme";
import type { SessionUser, UUID } from "../../../types";

type ConversationMembersModalProps = {
  visible: boolean;
  conversationId: UUID;
  onClose: () => void;
};

function getInitials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "?";
  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function displayNameForMember(member: SessionUser): string {
  const full = member.profile_full_name?.trim();
  if (full) return full;
  return "Unknown member";
}

function compareMembers(
  a: SessionUser,
  b: SessionUser,
  currentUserId: UUID | null,
): number {
  if (currentUserId) {
    if (a.user_id === currentUserId) return -1;
    if (b.user_id === currentUserId) return 1;
  }
  return displayNameForMember(a).localeCompare(displayNameForMember(b));
}

export const ConversationMembersModal: React.FC<
  ConversationMembersModalProps
> = ({ visible, conversationId, onClose }) => {
  const { session, user } = useAuthContext();
  const {
    getMembers,
    membersLoadingBySession,
    membersErrorBySession,
    loadMembersForSession,
  } = useMessageContext();

  const members = getMembers(conversationId);
  const loading = membersLoadingBySession[conversationId] ?? false;
  const error = membersErrorBySession[conversationId] ?? null;

  useEffect(() => {
    if (!visible || !session) return;
    void loadMembersForSession(session, conversationId);
  }, [conversationId, loadMembersForSession, session, visible]);

  const sortedMembers = useMemo(() => {
    const currentUserId = (user?.id as UUID | undefined) ?? null;
    return [...members].sort((a, b) => compareMembers(a, b, currentUserId));
  }, [members, user?.id]);

  const handleRefresh = () => {
    if (!session) return;
    void loadMembersForSession(session, conversationId);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={20}
                color={colors.textPrimary}
              />
              <Text variant="h3" style={styles.headerTitle}>
                Members
              </Text>
              <View style={styles.countPill}>
                <Text variant="caption" color="textSecondary">
                  {members.length}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close members list"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.closeButton}
            >
              <MaterialCommunityIcons
                name="close"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <View style={styles.body}>
            {loading && members.length === 0 ? (
              <View style={styles.stateRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  variant="body"
                  color="textSecondary"
                  style={styles.stateText}
                >
                  Loading members...
                </Text>
              </View>
            ) : error && members.length === 0 ? (
              <View style={styles.stateBlock}>
                <Text variant="body" color="error" style={styles.stateText}>
                  {error}
                </Text>
                <Pressable
                  onPress={handleRefresh}
                  accessibilityRole="button"
                  style={styles.retryButton}
                >
                  <Text variant="label" color="primary">
                    Try again
                  </Text>
                </Pressable>
              </View>
            ) : members.length === 0 ? (
              <View style={styles.stateBlock}>
                <Text
                  variant="body"
                  color="textSecondary"
                  style={styles.stateText}
                >
                  No members in this conversation yet.
                </Text>
              </View>
            ) : (
              <FlatList
                data={sortedMembers}
                keyExtractor={(item) => item.user_id}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                renderItem={({ item }) => {
                  const isSelf = user?.id === item.user_id;
                  const name = displayNameForMember(item);
                  return (
                    <View style={styles.memberRow}>
                      <View style={styles.avatar}>
                        <Text
                          variant="caption"
                          color="white"
                          style={styles.avatarText}
                        >
                          {getInitials(name)}
                        </Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text variant="body" style={styles.memberName}>
                          {isSelf ? `${name} (you)` : name}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    fontWeight: "600",
  },
  countPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeButton: {
    padding: spacing.xs,
  },
  body: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  stateBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  stateText: {
    marginLeft: spacing.sm,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    fontWeight: "600",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "500",
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
});
