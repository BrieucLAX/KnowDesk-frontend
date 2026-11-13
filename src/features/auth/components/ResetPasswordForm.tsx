import React from 'react';
import { useResetPassword } from '../hooks/useResetPassword';
import { Button }           from '../../../shared/components/ui/Button';
import { Input }            from '../../../shared/components/ui/Input';
import { ArrowLeft, CircleCheck } from 'lucide-react';

interface ResetPasswordFormProps {
  token:    string;
  onBack:   () => void;
}

export function ResetPasswordForm({ token, onBack }: ResetPasswordFormProps) {
  const {
    password, setPassword, confirmPassword, setConfirmPassword,
    loading, error, done, submit,
  } = useResetPassword(token, onBack);

  if (done) {
    return (
      <div className="forgot-success">
        <div className="forgot-success__icon forgot-success__icon--success" aria-hidden="true"><CircleCheck size={24} /></div>
        <h2 className="forgot-success__title">Mot de passe modifié</h2>
        <p className="forgot-success__desc">
          Ton mot de passe a été mis à jour. Tu vas être redirigé vers la connexion.
        </p>
      </div>
    );
  }

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      {error && <div className="login-form__error" role="alert">{error}</div>}
      <Input
        id="new-password"
        type="password"
        label="Nouveau mot de passe"
        placeholder="8 caractères minimum"
        value={password}
        onChange={e => setPassword(e.target.value)}
        autoComplete="new-password"
        autoFocus
      />
      <Input
        id="confirm-password"
        type="password"
        label="Confirmer le mot de passe"
        placeholder="Répète le mot de passe"
        value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
      />
      <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
        {loading ? 'Mise à jour…' : 'Changer le mot de passe'}
      </Button>
      <p className="login-form__signup">
        <button type="button" className="login-form__link icon-label" onClick={onBack}>
          <ArrowLeft size={16} />Retour à la connexion
        </button>
      </p>
    </form>
  );
}
