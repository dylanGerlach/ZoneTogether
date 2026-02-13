/**
 * New Message Screen - Create a new message session by selecting people from organizations
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text, Button, Checkbox } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { colors, spacing } from "../theme";
import {
  GetOrganizationsResponse,
  OrganizationVM,
  RootStackParamList,
  SessionCreatePayload,
} from "../types";
import {
  createSession,
  fetchOrganizations,
  fetchOrganizationUsers,
} from "../utils/backendApi";

type NewMessageScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "NewMessage"
>;
type NewMessageScreenRouteProp = RouteProp<RootStackParamList, "NewMessage">;

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const mapOrganizations = (
  response: GetOrganizationsResponse,
): OrganizationVM[] => {
  return response.organizations.map((membership) => ({
    id: membership.organization_id,
    name: membership.organization?.name ?? "Unnamed organization",
    description: membership.organization?.description ?? "",
    members: [],
  }));
};

const OrganizationItem: React.FC<{
  organization: OrganizationVM;
  onSelect: () => void;
}> = ({ organization, onSelect }) => {
  return (
    <TouchableOpacity
      style={styles.organizationItem}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.organizationHeaderContent}>
        <View style={styles.organizationAvatar}>
          <Text variant="body" color="white" style={styles.avatarText}>
            {getInitials(organization.name)}
          </Text>
        </View>
        <View style={styles.organizationInfo}>
          <Text variant="body" style={styles.organizationName}>
            {organization.name}
          </Text>
          <Text variant="caption" color="textSecondary">
            {organization.members.length} members
          </Text>
        </View>
      </View>
      <Text variant="body" color="textTertiary">
        →
      </Text>
    </TouchableOpacity>
  );
};

export const NewMessageScreen: React.FC = () => {
  const { session, user } = useAuthContext();
  const navigation = useNavigation<NewMessageScreenNavigationProp>();
  const route = useRoute<NewMessageScreenRouteProp>();
  const [organizations, setOrganizations] = useState<OrganizationVM[]>([]);
  const [selectedOrganization, setSelectedOrganization] =
    useState<OrganizationVM | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set(),
  );
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrganizations = useCallback(async () => {
    if (!session) return;

    setLoadingOrganizations(true);
    setError(null);
    try {
      const response = await fetchOrganizations(session);
      const mappedOrganizations = mapOrganizations(response);
      setOrganizations(mappedOrganizations);
      const initialSelection =
        mappedOrganizations.find(
          (org) => org.id === route.params.organizationId,
        ) ?? null;
      setSelectedOrganization(initialSelection);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Unable to load organizations right now.";
      setError(message);
      setOrganizations([]);
      setSelectedOrganization(null);
    } finally {
      setLoadingOrganizations(false);
    }
  }, [route.params.organizationId, session]);

  const loadMembers = useCallback(
    async (organizationId: string) => {
      if (!session) return;

      setLoadingMembers(true);
      setError(null);
      try {
        const response = await fetchOrganizationUsers(session, organizationId);
        const members = response.map((member) => ({
          user_id: member.user_id,
          profile_full_name: member.profile_full_name,
          role: member.role,
        }));
        setOrganizations((current) =>
          current.map((org) =>
            org.id === organizationId ? { ...org, members } : org,
          ),
        );
        setSelectedOrganization((current) =>
          current && current.id === organizationId
            ? { ...current, members }
            : current,
        );
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load organization members right now.";
        setError(message);
      } finally {
        setLoadingMembers(false);
      }
    },
    [session],
  );

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (!selectedOrganization) return;
    if (selectedOrganization.members.length > 0) return;
    void loadMembers(selectedOrganization.id);
  }, [loadMembers, selectedOrganization]);

  const handleSelectOrganization = (organization: OrganizationVM) => {
    setSelectedOrganization(organization);
    setSelectedMembers(new Set());
  };

  const handleBackToOrganizations = () => {
    setSelectedOrganization(null);
    setSelectedMembers(new Set());
  };

  const handleToggleMember = (memberId: string) => {
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

  const handleCreateSession = async () => {
    if (
      !session ||
      !selectedOrganization ||
      selectedMembers.size === 0 ||
      submitting
    ) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const users = new Set(Array.from(selectedMembers));
      if (user?.id) {
        users.add(user.id);
      }
      const payload: SessionCreatePayload = {
        organizationId: selectedOrganization.id,
        users: Array.from(users),
        title: `Conversation in ${selectedOrganization.name}`,
      };
      const created = await createSession(session, payload);
      navigation.replace("MessageDetail", {
        conversationId: created.id,
        title: created.title,
      });
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Unable to create a conversation right now.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = selectedMembers.size;
  const visibleOrganizations = useMemo(
    () => organizations.filter((org) => org.id !== route.params.organizationId),
    [organizations, route.params.organizationId],
  );

  const Container = Platform.OS === "web" ? View : SafeAreaView;
  const containerProps =
    Platform.OS === "web"
      ? { style: styles.container }
      : { style: styles.container, edges: ["top", "bottom"] as const };

  return (
    <Container {...containerProps}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={
            selectedOrganization
              ? handleBackToOrganizations
              : () => navigation.goBack()
          }
          style={styles.backButton}
        >
          <Text variant="body" color="primary">
            ← Back
          </Text>
        </TouchableOpacity>
        <Text variant="h3" style={styles.headerTitle}>
          {selectedOrganization ? selectedOrganization.name : "New Message"}
        </Text>
        <View style={styles.backButton} />
      </View>

      {!selectedOrganization ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          <Text
            variant="body"
            color="textSecondary"
            style={styles.instructions}
          >
            Select an organization to start a new conversation
          </Text>

          {loadingOrganizations ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text
                variant="body"
                color="textSecondary"
                style={styles.loadingText}
              >
                Loading organizations...
              </Text>
            </View>
          ) : (
            visibleOrganizations.map((org) => (
              <OrganizationItem
                key={org.id}
                organization={org}
                onSelect={() => handleSelectOrganization(org)}
              />
            ))
          )}
        </ScrollView>
      ) : (
        <>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            <Text
              variant="body"
              color="textSecondary"
              style={styles.instructions}
            >
              Select members from {selectedOrganization.name} to include in the
              conversation
            </Text>

            {loadingMembers ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  variant="body"
                  color="textSecondary"
                  style={styles.loadingText}
                >
                  Loading members...
                </Text>
              </View>
            ) : (
              selectedOrganization.members
                .filter((member) => member.user_id !== user?.id)
                .map((member) => (
                  <View key={member.user_id} style={styles.memberItem}>
                    <View style={styles.memberAvatar}>
                      <Text
                        variant="caption"
                        color="white"
                        style={styles.memberAvatarText}
                      >
                        {getInitials(member.profile_full_name ?? "Unknown User")}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text variant="body" style={styles.memberName}>
                        {member.profile_full_name ?? "Unknown User"}
                      </Text>
                      <Text variant="caption" color="textSecondary">
                        {member.role}
                      </Text>
                    </View>
                    <Checkbox
                      value={selectedMembers.has(member.user_id)}
                      onToggle={() => handleToggleMember(member.user_id)}
                    />
                  </View>
                ))
            )}
          </ScrollView>

          {selectedCount > 0 && (
            <View style={styles.footer}>
              <Text
                variant="body"
                color="textSecondary"
                style={styles.selectedCount}
              >
                {selectedCount} {selectedCount === 1 ? "person" : "people"}{" "}
                selected
              </Text>
              <Button
                variant="primary"
                onPress={handleCreateSession}
                loading={submitting}
                style={styles.createButton}
              >
                <Text variant="label" color="white">
                  Create Session
                </Text>
              </Button>
            </View>
          )}
        </>
      )}

      {error ? (
        <Text variant="caption" color="error" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  instructions: {
    marginBottom: spacing.lg,
    fontSize: 14,
  },
  organizationItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  organizationHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  organizationAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  organizationInfo: {
    flex: 1,
  },
  organizationName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  memberAvatarText: {
    fontSize: 12,
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
    justifyContent: "center",
    paddingVertical: spacing.lg,
  },
  loadingText: {
    marginLeft: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  selectedCount: {
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  createButton: {
    width: "100%",
  },
  errorText: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
});
