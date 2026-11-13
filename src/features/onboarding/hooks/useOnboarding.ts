import { useState, useCallback } from 'react';
import { apiClient, ApiError } from '../../../shared/lib/apiClient';
import { useToast } from '../../../shared/lib/useToast';
import type { OnboardingData, OnboardingErrors } from '../types';
import { STEPS } from '../types';

interface UseOnboardingReturn {
  stepIndex:   number;
  totalSteps:  number;
  currentStep: typeof STEPS[number];
  data:        OnboardingData;
  errors:      OnboardingErrors;
  isLastStep:  boolean;
  isSubmitting: boolean;

  updateField: <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => void;
  goNext:      () => void;
  goBack:      () => void;
  skip:        () => void;
  submit:      () => Promise<void>;
}

/**
 * Drives the 2-step onboarding wizard.
 * Both steps are optional — the admin can skip them and finish.
 *
 * @param onComplete - called after persistence (real API calls), with the
 * final data so the parent can mark `onboardingDone = true` côté backend.
 */
export function useOnboarding(onComplete: (data: OnboardingData) => void): UseOnboardingReturn {
  const toast = useToast();
  const [stepIndex,    setStepIndex]    = useState(0);
  const [data,         setData]         = useState<OnboardingData>({ inviteEmails: [], firstCategory: '' });
  const [errors,       setErrors]       = useState<OnboardingErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = STEPS[stepIndex];
  const isLastStep  = stepIndex === STEPS.length - 1;

  const updateField = useCallback(<K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const next = { ...prev }; delete next[field as keyof OnboardingErrors]; return next; });
  }, []);

  const goNext = useCallback(() => {
    setErrors({});
    if (isLastStep) return;
    setStepIndex(i => i + 1);
  }, [isLastStep]);

  const goBack = useCallback(() => {
    setErrors({});
    setStepIndex(i => Math.max(0, i - 1));
  }, []);

  /** Skip avance d'une étape sans valider — disponible sur toutes les étapes
   *  (les deux sont optionnelles). */
  const skip = useCallback(() => {
    setErrors({});
    if (isLastStep) {
      void persist({ ...data, inviteEmails: [], firstCategory: '' });
      return;
    }
    setStepIndex(i => i + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLastStep, data]);

  /**
   * Persiste les données de l'onboarding côté backend :
   * - Pour chaque email valide, POST /members/invite (role 'advisor' par défaut)
   * - Si une catégorie est saisie, POST /categories
   * - En cas d'échec partiel : toast warning mais on avance quand même
   *   (l'admin peut tout refaire depuis Settings / Knowledge).
   *
   * Le marquage onboardingDone côté backend est géré par le parent via
   * authStore.setOnboardingDone() — onComplete() lui passe la main.
   */
  const persist = useCallback(async (final: OnboardingData) => {
    setIsSubmitting(true);
    try {
      const failures: string[] = [];

      // 1. Invitations — en parallèle, role advisor par défaut
      if (final.inviteEmails.length > 0) {
        const results = await Promise.allSettled(
          final.inviteEmails.map(email =>
            apiClient.post('/members/invite', { email, role: 'advisor' }),
          ),
        );
        const rejected = results.filter(r => r.status === 'rejected');
        if (rejected.length > 0) {
          failures.push(`${rejected.length} invitation${rejected.length > 1 ? 's' : ''} non envoyée${rejected.length > 1 ? 's' : ''}`);
        }
      }

      // 2. Première catégorie — racine, slug auto-géré côté backend
      if (final.firstCategory.trim()) {
        try {
          await apiClient.post('/categories', { name: final.firstCategory.trim(), parentId: null });
        } catch (err) {
          failures.push('catégorie non créée');
        }
      }

      if (failures.length > 0) {
        toast.error(`Configuration incomplète : ${failures.join(', ')}. Réessayez depuis les écrans Équipe ou Articles.`);
      }
    } finally {
      setIsSubmitting(false);
      onComplete(final);
    }
  }, [onComplete, toast]);

  const submit = useCallback(async () => {
    await persist(data);
  }, [persist, data]);

  return {
    stepIndex, totalSteps: STEPS.length, currentStep, data, errors,
    isLastStep, isSubmitting,
    updateField, goNext, goBack, skip, submit,
  };
}
