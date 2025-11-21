/**
 * New Message Screen - Create a new message session by selecting people from organizations
 */

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text, Button, Checkbox } from "../components";
import { colors, spacing } from "../theme";
import { RootStackParamList } from "../types";

type NewMessageScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "NewMessage"
>;

interface OrganizationMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Organization {
  id: string;
  name: string;
  description: string;
  members: OrganizationMember[];
}

// Fake data
const fakeOrganizations: Organization[] = [
  {
    id: "1",
    name: "Community Cleanup Group",
    description: "Local community volunteers",
    members: [
      { id: "1", name: "John Doe", email: "john@example.com", role: "Member" },
      {
        id: "2",
        name: "Jane Smith",
        email: "jane@example.com",
        role: "Organizer",
      },
      {
        id: "3",
        name: "Mike Johnson",
        email: "mike@example.com",
        role: "Member",
      },
      {
        id: "4",
        name: "Sarah Williams",
        email: "sarah@example.com",
        role: "Member",
      },
    ],
  },
  {
    id: "2",
    name: "Downtown Volunteers",
    description: "Downtown area cleanup team",
    members: [
      {
        id: "5",
        name: "Alex Brown",
        email: "alex@example.com",
        role: "Organizer",
      },
      {
        id: "6",
        name: "Emma Davis",
        email: "emma@example.com",
        role: "Member",
      },
      {
        id: "7",
        name: "Chris Wilson",
        email: "chris@example.com",
        role: "Member",
      },
    ],
  },
  {
    id: "3",
    name: "Beach Cleanup Team",
    description: "Coastal area volunteers",
    members: [
      {
        id: "8",
        name: "Taylor Martinez",
        email: "taylor@example.com",
        role: "Member",
      },
      {
        id: "9",
        name: "Jordan Lee",
        email: "jordan@example.com",
        role: "Organizer",
      },
    ],
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

const OrganizationItem: React.FC<{
  organization: Organization;
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
  const navigation = useNavigation<NewMessageScreenNavigationProp>();
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );

  const handleSelectOrganization = (organization: Organization) => {
    setSelectedOrganization(organization);
    setSelectedMembers(new Set()); // Reset member selection when changing org
  };

  const handleBackToOrganizations = () => {
    setSelectedOrganization(null);
    setSelectedMembers(new Set());
  };

  const handleToggleMember = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleCreateSession = () => {
    if (selectedMembers.size > 0 && selectedOrganization) {
      // In real app, this would create the session and navigate to it
      // For now, just navigate back to message list
      navigation.goBack();
    }
  };

  const selectedCount = selectedMembers.size;

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
            ← {selectedOrganization ? "Back" : "Back"}
          </Text>
        </TouchableOpacity>
        <Text variant="h3" style={styles.headerTitle}>
          {selectedOrganization ? selectedOrganization.name : "New Message"}
        </Text>
        <View style={styles.backButton} />
      </View>

      {!selectedOrganization ? (
        // Step 1: Select Organization
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          <Text variant="body" color="textSecondary" style={styles.instructions}>
            Select an organization to start a new conversation
          </Text>

          {fakeOrganizations.map((org) => (
            <OrganizationItem
              key={org.id}
              organization={org}
              onSelect={() => handleSelectOrganization(org)}
            />
          ))}
        </ScrollView>
      ) : (
        // Step 2: Select Members
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
              Select members from {selectedOrganization.name} to include in the conversation
            </Text>

            {selectedOrganization.members.map((member) => (
              <View key={member.id} style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  <Text
                    variant="caption"
                    color="white"
                    style={styles.memberAvatarText}
                  >
                    {getInitials(member.name)}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text variant="body" style={styles.memberName}>
                    {member.name}
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {member.role}
                  </Text>
                </View>
                <Checkbox
                  value={selectedMembers.has(member.id)}
                  onToggle={() => handleToggleMember(member.id)}
                />
              </View>
            ))}
          </ScrollView>

          {selectedCount > 0 && (
            <View style={styles.footer}>
              <Text
                variant="body"
                color="textSecondary"
                style={styles.selectedCount}
              >
                {selectedCount} {selectedCount === 1 ? "person" : "people"} selected
              </Text>
              <Button
                variant="primary"
                onPress={handleCreateSession}
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
  membersList: {
    padding: spacing.sm,
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
});

