import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Button, Card, Checkbox, Input, ScreenScaffold, Text } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { useMessageContext } from "../context/MessageContext";
import { useOrganizationContext } from "../context/OrganizationContext";
import { useCompactLayout } from "../hooks/useCompactLayout";
import { colors, spacing } from "../theme";
import { RootStackParamList, SessionCreatePayload } from "../types";

type NewMessageScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "NewMessage"
>;
type NewMessageScreenRouteProp = RouteProp<RootStackParamList, "NewMessage">;

const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

export const NewMessageScreen: React.FC = () => {
  const { session, user } = useAuthContext();
  const navigation = useNavigation<NewMessageScreenNavigationProp>();
  const route = useRoute<NewMessageScreenRouteProp>();
  const { organizationId, organizationName } = route.params;
  const { cardPadding } = useCompactLayout();

  const {
    getOrganizationUsers,
    organizationUsersLoadingByOrg,
    organizationUsersErrorByOrg,
    loadOrganizationUsers,
  } = useOrganizationContext();
  const { createConversation, creatingConversation, createConversationError } =
    useMessageContext();

  const [title, setTitle] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const members = getOrganizationUsers(organizationId);
  const loadingMembers = organizationUsersLoadingByOrg[organizationId] ?? false;
  const membersError = organizationUsersErrorByOrg[organizationId] ?? null;

  useEffect(() => {
    if (!session) return;
    if (members.length > 0) return;
    void loadOrganizationUsers(session, organizationId);
  }, [loadOrganizationUsers, members.length, organizationId, session]);

  const otherMembers = useMemo(
    () => members.filter((member) => member.user_id !== user?.id),
    [members, user?.id],
  );

  const selectedCount = selectedMembers.size;
  const canSubmit = selectedCount > 0 && !creatingConversation;

  const toggleMember = (memberId: string) => {
    setSelectedMembers((current) => {
      const next = new Set(current);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!session || !canSubmit) return;

    const selectedUsers = Array.from(selectedMembers);
    const selectedNames = selectedUsers
      .map((userId) => {
        const match = members.find((member) => member.user_id === userId);
        return match?.profile_full_name?.trim() || null;
      })
      .filter((value): value is string => Boolean(value));

    const defaultTitle =
      selectedNames.length > 0
        ? selectedNames.join(", ")
        : `Conversation in ${organizationName}`;

    const ids = new Set(selectedUsers);
    if (user?.id) ids.add(user.id);

    const payload: SessionCreatePayload = {
      organizationId,
      users: Array.from(ids),
      title: title.trim() || defaultTitle,
    };

    const created = await createConversation(session, payload);
    if (created) {
      navigation.replace("MessageDetail", {
        conversationId: created.id,
        title: created.title,
      });
    }
  };

  const error = membersError ?? createConversationError;

  return (
    <ScreenScaffold
      title="New Message"
      subtitle={organizationName}
      leftAction={{
        iconName: "arrow-left",
        accessibilityLabel: "Back",
        onPress: () => navigation.goBack(),
      }}
    >
      <Card style={[styles.card, { padding: cardPadding }]}>
        <Text variant="h3" style={styles.sectionTitle}>
          Title
        </Text>
        <Input
          value={title}
          onChangeText={setTitle}
          placeholder="Optional thread title"
        />
      </Card>

      <Card style={[styles.card, { padding: cardPadding }]}>
        <View style={styles.sectionHeader}>
          <Text variant="h3">Participants</Text>
          <Text variant="caption" color="textSecondary">
            {selectedCount} selected
          </Text>
        </View>

        {loadingMembers ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text variant="body" color="textSecondary" style={styles.loadingText}>
              Loading members...
            </Text>
          </View>
        ) : otherMembers.length === 0 ? (
          <Text variant="caption" color="textSecondary">
            No other members in this organization yet.
          </Text>
        ) : (
          <ScrollView style={styles.memberList} contentContainerStyle={styles.memberListContent}>
            {otherMembers.map((member) => {
              const selected = selectedMembers.has(member.user_id);
              const fullName = member.profile_full_name ?? "Unknown User";
              return (
                <View key={member.user_id} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text variant="caption" color="white" style={styles.memberAvatarText}>
                      {getInitials(fullName)}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text variant="body" style={styles.memberName}>
                      {fullName}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {member.role}
                    </Text>
                  </View>
                  <Checkbox
                    value={selected}
                    onToggle={() => toggleMember(member.user_id)}
                  />
                </View>
              );
            })}
          </ScrollView>
        )}
      </Card>

      {error ? (
        <Text variant="caption" color="error" style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      <Button
        variant="primary"
        onPress={() => void handleCreate()}
        loading={creatingConversation}
        disabled={!canSubmit}
        style={styles.submitButton}
      >
        <Text variant="label" color="white">
          Create Thread
        </Text>
      </Button>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  memberList: {
    maxHeight: 360,
  },
  memberListContent: {
    gap: spacing.xs,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  memberAvatarText: {
    fontWeight: "600",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  loadingState: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    marginLeft: spacing.sm,
  },
  errorText: {
    marginTop: -spacing.xs,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
});
