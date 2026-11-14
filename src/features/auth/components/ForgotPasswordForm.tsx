import React from 'react';
import { useForgotPassword } from '../hooks/useForgotPassword';
import '../auth.css';
import { Button }            from '../../../shared/components/ui/Button';
import { Input }             from '../../../shared/components/ui/Input';
import { ArrowLeft, Mail } from 'lucide-react';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const { email, setEmail, loading, sent, error, submit } = useForgotPassword();

  if (sent) {
    return (
      <div className="forgot-success">
        <div className="forgot-success__icon" aria-hidden="true"><Mail size={24} /></div>
        <h2 className="forgot-success__title">E-mail envoyé</h2>
        <p className="forgot-success__desc">
          Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien de réinitialisation dans quelques minutes.
        </p>
        <p className="forgot-success__desc">Vérifiez aussi vos courriers indésirables.</p>
        <Button variant="ghost" size="md" onClick={onBack} leftIcon={<ArrowLeft size={20} />}>Retour à la connexion</Button>
      </div>
    );
  }

  return (
    <form className="login-form" onSubmit={submit} noValidate>
      {error && <div className="login-form__error" role="alert">{error}</div>}
      <Input
        id="forgot-email"
        type="email"
        label="Adresse e-mail"
        placeholder="vous@exemple.fr"
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoComplete="email"
        autoFocus
      />
      <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
        {loading ? 'Envoi…' : 'Envoyer le lien'}
      </Button>
      <p className="login-form__signup">
        <button type="button" className="login-form__link icon-label" onClick={onBack}>
          <ArrowLeft size={16} />Retour à la connexion
        </button>
      </p>
    </form>
  );
}
