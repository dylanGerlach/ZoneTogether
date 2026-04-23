import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "../../theme";
import { AppGradientHeader } from "./AppGradientHeader";
import { AppNavbar, type AppNavbarAction } from "./AppNavbar";

type ScreenScaffoldProps = {
  title: string;
  subtitle?: string;
  kicker?: string;
  leftAction?: AppNavbarAction;
  rightActions?: AppNavbarAction[];
  scroll?: boolean;
  // Optional ref to the internal ScrollView so callers can imperatively scroll
  // the screen (e.g. bringing the map back into view from a deep-scrolled chat).
  scrollRef?: React.Ref<ScrollView>;
  children: React.ReactNode;
};

const MOBILE_BREAKPOINT = 768;

export const ScreenScaffold: React.FC<ScreenScaffoldProps> = ({
  title,
  subtitle,
  kicker,
  leftAction,
  rightActions = [],
  scroll = true,
  scrollRef,
  children,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  const horizontalPadding = isMobile ? spacing.xs : spacing.lg;

  const Container = Platform.OS === "web" ? View : SafeAreaView;
  const containerProps =
    Platform.OS === "web"
      ? { style: styles.container }
      : { style: styles.container, edges: ["top", "bottom"] as const };

  const hasActions = Boolean(leftAction) || rightActions.length > 0;

  const actionBar = hasActions ? (
    <AppNavbar
      leftAction={leftAction}
      rightActions={rightActions}
      mode="detached"
    />
  ) : null;

  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingHorizontal: horizontalPadding },
      ]}
    >
      {actionBar}
      {children}
    </ScrollView>
  ) : (
    <View
      style={[styles.fixedContent, { paddingHorizontal: horizontalPadding }]}
    >
      {actionBar}
      {children}
    </View>
  );

  return (
    <Container {...containerProps}>
      <AppGradientHeader title={title} subtitle={subtitle} kicker={kicker} />
      {content}
    </Container>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  fixedContent: {
    flex: 1,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
});
