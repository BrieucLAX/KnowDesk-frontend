import React, { useState, useCallback } from 'react';
import { useAccount }  from '../hooks/useAccount';
import '../account.css';
import { Button }      from '../../../shared/components/ui/Button';
import { Input }       from '../../../shared/components/ui/Input';
import { PageHeader }  from '../../../shared/components/layout/PageHeader';
import { useAuthStore, selectUserRole, selectOrganization } from '../../../store/authStore';
import { canRunSetupWizard } from '../../../shared/lib/modules';
import { useToast }    from '../../../shared/lib/useToast';
import { ApiError }    from '../../../shared/lib/apiClient';

export function AccountPage() {
  const { profile, loading, updateProfile, changePassword, requestEmailChange } = useAccount();
  const role            = useAuthStore(selectUserRole);
  const organization    = useAuthStore(selectOrganization);
  const resetOnboarding = useAuthStore(s => s.resetOnboarding);
  const toast           = useToast();
  const [resettingOnboarding, setResettingOnboarding] = useState(false);

  const handleResetOnboarding = useCallback(async () => {
    setResettingOnboarding(true);
    try {
      await resetOnboarding();
      toast.success('L\'onboarding va se relancer.');
      // L'app détectera onboardingDone=false au prochain render et affichera la wizard.
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Impossible de relancer l\'onboarding.');
    } finally {
      setResettingOnboarding(false);
    }
  }, [resetOnboarding, toast]);

  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '' });
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });
  const [passwordError,   setPasswordError]   = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [emailForm,    setEmailForm]    = useState({ newEmail: '' });
  const [emailSent,    setEmailSent]    = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Initialise le form quand le profil est chargé
  React.useEffect(() => {
    if (profile) {
      setProfileForm({
        firstName: profile.first_name ?? '',
        lastName:  profile.last_name  ?? '',
      });
    }
  }, [profile]);

  const handleProfileSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await updateProfile({ firstName: profileForm.firstName, lastName: profileForm.lastName });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch { /* silencieux */ } finally {
      setProfileLoading(false);
    }
  }, [profileForm, updateProfile]);

  const handlePasswordSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword:     passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setPasswordLoading(false);
    }
  }, [passwordForm, changePassword]);

  const handleEmailChange = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    try {
      await requestEmailChange(emailForm.newEmail);
      setEmailSent(true);
    } catch { /* silencieux */ } finally {
      setEmailLoading(false);
    }
  }, [emailForm, requestEmailChange]);

  if (loading) return <div className="account-page account-page--loading" />;

  return (
    <div className="account-page">
      <PageHeader
        title="Mon compte"
        subtitle="Votre profil, votre mot de passe et votre adresse email."
      />
      <div className="account-page__body">
      {/* Profil */}
      <section className="account-section">
        <div className="account-section__header">
          <h2 className="account-section__title">Profil</h2>
          <p className="account-section__desc">Votre nom affiché dans l'application.</p>
        </div>
        <form className="account-form" onSubmit={handleProfileSave}>
          <div className="account-form__row">
            <Input
              id="firstName"
              label="Prénom"
              value={profileForm.firstName}
              onChange={e => setProfileForm(p => ({ ...p, firstName: e.target.value }))}
            />
            <Input
              id="lastName"
              label="Nom"
              value={profileForm.lastName}
              onChange={e => setProfileForm(p => ({ ...p, lastName: e.target.value }))}
            />
          </div>
          <div className="account-form__info">
            <span className="account-form__email">{profile?.email}</span>
          </div>
          <div className="account-form__actions">
            <Button type="submit" variant="primary" size="md" loading={profileLoading}>
              Enregistrer
            </Button>
            {profileSaved && (
              <span className="account-form__saved" role="status">✓ Enregistré</span>
            )}
          </div>
        </form>
      </section>

      {/* Changer l'email */}
      <section className="account-section">
        <div className="account-section__header">
          <h2 className="account-section__title">Adresse email</h2>
          <p className="account-section__desc">
            Un email de confirmation sera envoyé à la nouvelle adresse.
          </p>
        </div>
        {emailSent ? (
          <div className="account-success" role="status">
            ✓ Email de confirmation envoyé à <strong>{emailForm.newEmail}</strong>.
            Vérifiez votre boîte de réception.
          </div>
        ) : (
          <form className="account-form" onSubmit={handleEmailChange}>
            <Input
              id="newEmail"
              type="email"
              label="Nouvelle adresse email"
              placeholder={profile?.email}
              value={emailForm.newEmail}
              onChange={e => setEmailForm({ newEmail: e.target.value })}
            />
            <div className="account-form__actions">
              <Button type="submit" variant="primary" size="md" loading={emailLoading}>
                Changer l'email
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* Changer le mot de passe */}
      <section className="account-section">
        <div className="account-section__header">
          <h2 className="account-section__title">Mot de passe</h2>
          <p className="account-section__desc">Choisissez un mot de passe sécurisé.</p>
        </div>
        <form className="account-form" onSubmit={handlePasswordSave}>
          <Input
            id="currentPassword"
            type="password"
            label="Mot de passe actuel"
            value={passwordForm.currentPassword}
            onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
          />
          <Input
            id="newPassword"
            type="password"
            label="Nouveau mot de passe"
            value={passwordForm.newPassword}
            onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
          />
          <Input
            id="confirmPassword"
            type="password"
            label="Confirmer le nouveau mot de passe"
            value={passwordForm.confirmPassword}
            onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
          />
          {passwordError && <p className="field-error" role="alert">{passwordError}</p>}
          <div className="account-form__actions">
            <Button type="submit" variant="primary" size="md" loading={passwordLoading}>
              Changer le mot de passe
            </Button>
          </div>
        </form>
      </section>

      {role === 'admin' && canRunSetupWizard(organization) && (
        <section className="account-section">
          <div className="account-section__header">
            <h2 className="account-section__title">Onboarding</h2>
            <p className="account-section__desc">
              Si vous avez sauté trop vite, vous pouvez rejouer le tutoriel d'arrivée pour
              inviter votre équipe et créer votre première catégorie.
            </p>
          </div>
          <div className="account-form__actions">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={handleResetOnboarding}
              loading={resettingOnboarding}
            >
              ↻ Refaire l'onboarding
            </Button>
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
