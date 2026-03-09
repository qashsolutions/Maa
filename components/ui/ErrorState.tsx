import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { RefreshIcon } from '../../icons';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorState = React.memo(function ErrorState({
  message,
  onRetry,
  retryLabel = 'Retry',
}: ErrorStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { borderColor: colors.error }]}>
        <Text style={[styles.errorMark, { color: colors.error }]}>!</Text>
      </View>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry && (
        <Pressable style={[styles.retryBtn, { borderColor: colors.gold }]} onPress={onRetry}>
          <RefreshIcon size={16} color={colors.gold} />
          <Text style={[styles.retryText, { color: colors.gold }]}>{retryLabel}</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorMark: {
    fontSize: 24,
    fontFamily: 'DMSans-Bold',
  },
  message: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  retryText: {
    ...Typography.bodyMedium,
  },
});
