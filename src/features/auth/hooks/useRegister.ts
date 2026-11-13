import { useState, useCallback } from 'react';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import type { AuthSession } from '../types';

interface RegisterForm {
  firstName:       string;
  lastName:        string;
  orgName:         string;
  email:           string;
  password:        string;
  confirmPassword: string;
  gdprAccepted:    boolean;
}

interface RegisterErrors {
  firstName?:       string;
  lastName?:        string;
  orgName?:         string;
  email?:           string;
  password?:        string;
  confirmPassword?: string;
  gdprAccepted?:    string;
  general?:         string;
}

function validate(form: RegisterForm): RegisterErrors {
  const errors: RegisterErrors = {};
  if (!form.firstName.trim())        errors.firstName = 'Saisissez votre prénom.';
  if (!form.lastName.trim())         errors.lastName  = 'Saisissez votre nom.';
  if (!form.orgName.trim())          errors.orgName  = 'Saisissez le nom de votre organisation.';
  if (!form.email.trim())            errors.email    = 'Saisissez votre adresse e-mail.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                     errors.email    = 'Saisissez une adresse e-mail valide, par exemple nom@entreprise.fr.';
  if (form.password.length < 8)      errors.password = 'Le mot de passe doit contenir au moins 8 caractères.';
  if (form.password !== form.confirmPassword)
                                     errors.confirmPassword = 'Les mots de passe ne correspondent pas.';
  if (!form.gdprAccepted)            errors.gdprAccepted = 'Acceptez la politique de confidentialité pour créer votre organisation.';
  return errors;
}

export function useRegister(onSuccess: (session: AuthSession) => void) {
  const [form, setForm] = useState<RegisterForm>({
    firstName: '', lastName: '', orgName: '',
    email: '', password: '', confirmPassword: '',
    gdprAccepted: false,
  });
  const [errors,      setErrors]      = useState<RegisterErrors>({});
  const [isLoading,   setIsLoading]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const v = type === 'checkbox' ? checked : value;
    setForm(prev => ({ ...prev, [name]: v }));
    if (errors[name as keyof RegisterErrors]) {
      setErrors(prev => { const n = { ...prev }; delete n[name as keyof RegisterErrors]; return n; });
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setIsLoading(true);
    try {
      const data = await apiClient.post<any>('/auth/register', {
        email:        form.email.toLowerCase().trim(),
        password:     form.password,
        orgName:      form.orgName.trim(),
        firstName:    form.firstName.trim(),
        lastName:     form.lastName.trim(),
        gdprAccepted: form.gdprAccepted,
      });

      onSuccess({
        accessToken: data.accessToken,
        user:        data.user,
        organization: data.organization,
      });
    } catch (err) {
      setErrors({ general: err instanceof ApiError || err instanceof Error
        ? err.message
        : 'Votre organisation n\'a pas pu être créée. Réessayez dans quelques instants.' });
    } finally {
      setIsLoading(false);
    }
  }, [form, onSuccess]);

  return {
    form, errors, isLoading, showPassword,
    handleChange, handleSubmit,
    togglePassword: () => setShowPassword(p => !p),
  };
}
