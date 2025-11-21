/**
 * Root navigation setup
 */

import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuthContext } from "../context/AuthContext";
import {
  LoginScreen,
  SignupScreen,
  HomeScreen,
  MessageListScreen,
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
    <AppStack.Screen name="MessageList" component={MessageListScreen} />
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
      {user ? <AppStackNavigator /> : <AuthStackNavigator />}
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
