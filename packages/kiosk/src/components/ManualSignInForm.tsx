import React from 'react';
import { StyleSheet, View, Text, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KioskButton } from './KioskButton';
import { colors, typography } from '@/src/theme';
import { FONT } from '@/src/theme/typography';

const schema = z.object({
  identifier: z
    .string()
    .min(1, 'Please enter your email or employee ID')
    .max(256, 'Too long'),
});

type FormValues = z.infer<typeof schema>;

interface ManualSignInFormProps {
  onSubmit: (identifier: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ManualSignInForm({ onSubmit, onCancel, isLoading }: ManualSignInFormProps) {
  const { control, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const submit = (values: FormValues) => {
    onSubmit(values.identifier.trim());
    reset();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <Text style={[typography.heading, styles.label]}>Email or Employee ID</Text>

      <Controller
        control={control}
        name="identifier"
        render={({ field: { onChange, value, onBlur } }) => (
          <TextInput
            style={[styles.input, errors.identifier && styles.inputError]}
            placeholder="you@company.com"
            placeholderTextColor={colors.inputPlaceholder}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="done"
            onSubmitEditing={handleSubmit(submit)}
            editable={!isLoading}
          />
        )}
      />

      {errors.identifier && (
        <Text style={styles.errorText}>{errors.identifier.message}</Text>
      )}

      <View style={styles.actions}>
        <KioskButton
          label={isLoading ? 'Signing in…' : 'Sign In'}
          onPress={handleSubmit(submit)}
          size="lg"
          fullWidth
          disabled={isLoading}
        />
        <KioskButton
          label="Cancel"
          variant="ghost"
          onPress={onCancel}
          size="md"
          fullWidth
          disabled={isLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 16,
  },
  label: {
    fontSize: 18,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 20,
    fontFamily: FONT,
    color: colors.inputText,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: -8,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
});
