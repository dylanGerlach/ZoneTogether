/**
 * Root navigation setup
 */

import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuthContext } from "../context/AuthContext";
import { OrganizationProvider } from "../context/OrganizationContext";
import { ProjectProvider } from "../context/ProjectContext";
import { MessageProvider } from "../context/MessageContext";
import {
  LoginScreen,
  SignupScreen,
  HomeScreen,
  AccountScreen,
  OrganizationScreen,
  ProjectListScreen,
  ProjectDetailScreen,
  ProjectMapScreen,
  ZoneMapScreen,
  MessageDetailScreen,
  NewMessageScreen,
} from "../screens";
import { colors } from "../theme";
import type { RootStackParamList } from "../types";

const AuthStack = createNativeStackNavigator<RootStackParamList>();
const AppStack = createNativeStackNavigator<RootStackParamList>();

const AuthStackNavigator = () => (
  <AuthStack.Navigator
    initialRouteName="Login"
    screenOptions={{
      headerShown: false,
      animation: "slide_from_right",
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Signup" component={SignupScreen} />
  </AuthStack.Navigator>
);

const AppStackNavigator = () => (
  <AppStack.Navigator
    initialRouteName="Home"
    screenOptions={{
      headerShown: false,
      animation: "slide_from_right",
    }}
  >
    <AppStack.Screen name="Home" component={HomeScreen} />
    <AppStack.Screen name="Account" component={AccountScreen} />
    <AppStack.Screen name="Organization" component={OrganizationScreen} />
    <AppStack.Screen name="ProjectList" component={ProjectListScreen} />
    <AppStack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
    <AppStack.Screen name="ProjectMap" component={ProjectMapScreen} />
    <AppStack.Screen name="ZoneMap" component={ZoneMapScreen} />
    <AppStack.Screen name="MessageDetail" component={MessageDetailScreen} />
    <AppStack.Screen name="NewMessage" component={NewMessageScreen} />
  </AppStack.Navigator>
);

export const AppNavigator: React.FC = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <OrganizationProvider>
          <ProjectProvider>
            <MessageProvider>
              <AppStackNavigator />
            </MessageProvider>
          </ProjectProvider>
        </OrganizationProvider>
      ) : (
        <AuthStackNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
