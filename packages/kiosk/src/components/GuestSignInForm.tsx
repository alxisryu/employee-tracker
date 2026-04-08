import React from 'react';
import { StyleSheet, View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KioskButton } from './KioskButton';
import { colors, typography } from '@/src/theme';
import { FONT } from '@/src/theme/typography';

const schema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(128),
  company: z.string().max(128).optional(),
  host: z.string().max(128).optional(),
  reason: z.string().max(256).optional(),
});

type FormValues = z.infer<typeof schema>;

interface GuestSignInFormProps {
  onSubmit: (data: FormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  error,
  required,
  keyboardType,
  onSubmitEditing,
  returnKeyType,
  editable,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur: () => void;
  error?: string;
  required?: boolean;
  keyboardType?: TextInput['props']['keyboardType'];
  onSubmitEditing?: () => void;
  returnKeyType?: TextInput['props']['returnKeyType'];
  editable?: boolean;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>
        {label}
        {required && <Text style={fieldStyles.required}> *</Text>}
      </Text>
      <TextInput
        style={[fieldStyles.input, error && fieldStyles.inputError]}
        placeholder={placeholder}
        placeholderTextColor={colors.inputPlaceholder}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        keyboardType={keyboardType}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType ?? 'next'}
        editable={editable}
      />
      {error && <Text style={fieldStyles.errorText}>{error}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { ...typography.label, color: colors.textSecondary },
  required: { color: colors.error },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    fontFamily: FONT,
    color: colors.inputText,
  },
  inputError: { borderColor: colors.error },
  errorText: { color: colors.error, fontSize: 13 },
});

export function GuestSignInForm({ onSubmit, onCancel, isLoading }: GuestSignInFormProps) {
  const { control, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const submit = (values: FormValues) => {
    onSubmit(values);
    reset();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, value, onBlur } }) => (
            <Field
              label="Full name"
              placeholder="Jane Smith"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.fullName?.message}
              required
              returnKeyType="next"
              editable={!isLoading}
            />
          )}
        />
        <Controller
          control={control}
          name="company"
          render={({ field: { onChange, value, onBlur } }) => (
            <Field
              label="Company"
              placeholder="Acme Corp"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              returnKeyType="next"
              editable={!isLoading}
            />
          )}
        />
        <Controller
          control={control}
          name="host"
          render={({ field: { onChange, value, onBlur } }) => (
            <Field
              label="Who are you visiting?"
              placeholder="John Doe"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              returnKeyType="next"
              editable={!isLoading}
            />
          )}
        />
        <Controller
          control={control}
          name="reason"
          render={({ field: { onChange, value, onBlur } }) => (
            <Field
              label="Reason for visit"
              placeholder="Meeting, delivery, interview…"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              returnKeyType="done"
              onSubmitEditing={handleSubmit(submit)}
              editable={!isLoading}
            />
          )}
        />

        <View style={styles.actions}>
          <KioskButton
            label={isLoading ? 'Signing in…' : 'Sign In as Guest'}
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  scroll: { gap: 16, paddingBottom: 32 },
  actions: { gap: 12, marginTop: 8 },
});
