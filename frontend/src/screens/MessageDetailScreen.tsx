/**
 * Message Detail Screen - Displays messages in a conversation
 */

import React, { useState } from "react";
import { KeyboardAvoidingView, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import { ScreenScaffold } from "../components";
import { useAuthContext } from "../context/AuthContext";
import { useMessageContext } from "../context/MessageContext";
import { useOrganizationContext } from "../context/OrganizationContext";
import { useProjectContext } from "../context/ProjectContext";
import { ConversationMembersModal } from "../features/messaging/components/ConversationMembersModal";
import { MessageThreadView } from "../features/messaging/components/MessageThreadView";
import type { RootStackParamList } from "../types";

type MessageDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "MessageDetail"
>;

type MessageDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  "MessageDetail"
>;

export const MessageDetailScreen: React.FC = () => {
  const { session } = useAuthContext();
  const route = useRoute<MessageDetailScreenRouteProp>();
  const navigation = useNavigation<MessageDetailScreenNavigationProp>();
  const { conversationId, title } = route.params;
  const { getSession, loadMessagesForSession } = useMessageContext();
  const { getProject } = useProjectContext();
  const { getOrganization, getRole } = useOrganizationContext();

  const [membersModalVisible, setMembersModalVisible] = useState(false);

  const currentSession = getSession(conversationId);
  const linkedProjectId = currentSession?.project_id ?? null;
  const linkedProject = linkedProjectId ? getProject(linkedProjectId) : null;

  const handleGridChipPress = (cell: string) => {
    if (!linkedProject) return;
    const organizationId = linkedProject.organization_id;
    const membership = getOrganization(organizationId);
    const organizationName = membership?.organization?.name ?? "Organization";
    const role = getRole(organizationId);
    if (!role) return;
    navigation.navigate("ProjectMap", {
      organizationId,
      organizationName,
      organizationRole: role,
      projectId: linkedProject.id,
      focusH3Cell: cell,
    });
  };

  const handleRefresh = () => {
    if (!session) return;
    void loadMessagesForSession(session, conversationId);
  };

  return (
    <ScreenScaffold
      title={title}
      subtitle="Conversation"
      scroll={false}
      leftAction={{
        iconName: "arrow-left",
        accessibilityLabel: "Back to messages",
        onPress: () => navigation.goBack(),
      }}
      rightActions={[
        {
          iconName: "account-group-outline",
          accessibilityLabel: "View conversation members",
          onPress: () => setMembersModalVisible(true),
        },
        {
          iconName: "refresh",
          accessibilityLabel: "Refresh messages",
          onPress: handleRefresh,
        },
      ]}
    >
      <KeyboardAvoidingView
        behavior="height"
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <MessageThreadView
          conversationId={conversationId}
          onGridChipPress={linkedProject ? handleGridChipPress : undefined}
          fillParent
        />
      </KeyboardAvoidingView>
      <ConversationMembersModal
        visible={membersModalVisible}
        conversationId={conversationId}
        onClose={() => setMembersModalVisible(false)}
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
});
