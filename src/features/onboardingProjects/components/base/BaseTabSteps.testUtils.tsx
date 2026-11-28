import React from 'react';
import { Tabs } from '../../../../shared/components/ui/Tabs';
import { BaseTab } from './BaseTab';
import type { BaseView } from './PlanTab';

/**
 * Tests seulement. Parcours (lot 1 « Socle ») : la page montre l'étape 4 (`plan`) ou l'étape 5
 * (`articles`) ; ce harnais tient l'étape affichée comme la page (`onOpenView`), en partant de
 * `initial`, et la change avec deux onglets « Plan » et « Articles rédigés », qui jouent le rôle
 * du stepper de la page.
 */
export function BaseTabSteps({ initial = 'articles', ...props }: Omit<React.ComponentProps<typeof BaseTab>, 'view' | 'onOpenView'> & { initial?: BaseView }) {
  const [view, setView] = React.useState<BaseView>(initial);
  return (
    <>
      <Tabs id="test-steps" items={[{ id: 'plan', label: 'Plan' }, { id: 'articles', label: 'Articles rédigés' }]}
        value={view} onChange={v => setView(v as BaseView)} ariaLabel="Étapes (test)" />
      <BaseTab {...props} view={view} onOpenView={setView} />
    </>
  );
}
