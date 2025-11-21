/**
 * Navigation type definitions
 */

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Home: undefined;
  MessageList: undefined;
  MessageDetail: { conversationId: string; title: string };
  NewMessage: undefined;
};

export type ScreenName = keyof RootStackParamList;
