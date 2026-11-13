import { useState, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { mockLogin } from '../api/authApi.mock';
import { validateLoginForm, isFormValid } from './useLoginValidation';
import type { LoginFormState, LoginFormErrors, AuthSession } from '../types';

interface UseLoginReturn {
  values:      LoginFormState;
  errors:      LoginFormErrors;
  isLoading:   boolean;
  showPassword: boolean;
  handleChange:  (field: keyof LoginFormState, value: string) => void;
  handleBlur:    (field: keyof LoginFormState) => void;
  handleSubmit:  (e: React.FormEvent) => Promise<void>;
  togglePassword: () => void;
}

/**
 * Encapsulates all login form logic.
 * The LoginPage component stays as a thin presentation layer.
 *
 * @param onSuccess - called with the session after a successful login
 * @param useMock   - set to true in dev/tests to skip the real API
 */
export function useLogin(
  onSuccess: (session: AuthSession) => void,
  useMock = false,
): UseLoginReturn {
  const [values, setValues] = useState<LoginFormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof LoginFormState, boolean>>>({});

  const handleChange = useCallback((field: keyof LoginFormState, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }));

    // Re-validate field only after it has been touched (avoids eager errors)
    if (touched[field]) {
      setErrors(prev => {
        const next = { ...prev };
        const fieldError = validateLoginForm({ ...values, [field]: value })[field];
        if (fieldError) {
          next[field] = fieldError;
        } else {
          delete next[field];
        }
        return next;
      });
    }
  }, [touched, values]);

  const handleBlur = useCallback((field: keyof LoginFormState) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const fieldErrors = validateLoginForm(values);
    if (fieldErrors[field]) {
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] }));
    }
  }, [values]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateLoginForm(values);
    if (!isFormValid(validationErrors)) {
      setErrors(validationErrors);
      setTouched({ email: true, password: true });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const session = useMock
        ? await mockLogin(values.email, values.password)
        : await authApi.login(values);

      onSuccess(session);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'La connexion a échoué. Réessayez dans quelques instants.';

      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  }, [values, useMock, onSuccess]);

  const togglePassword = useCallback(() => setShowPassword(p => !p), []);

  return { values, errors, isLoading, showPassword, handleChange, handleBlur, handleSubmit, togglePassword };
}
