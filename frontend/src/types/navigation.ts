/**
 * Navigation type definitions
 */

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Home: undefined;
};

export type ScreenName = keyof RootStackParamList;
