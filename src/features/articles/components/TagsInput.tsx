import React, { useEffect, useState } from 'react';
import { ChipsInput } from '../../../shared/components/ui/ChipsInput';
import { tagsApi }    from '../api/tagsApi';

interface TagsInputProps {
  value:    string[];
  onChange: (next: string[]) => void;
  max?:     number;
  disabled?: boolean;
  /** id du champ, pour le relier au <label htmlFor> de l'écran. */
  id?:       string;
  describedBy?: string;
}

/**
 * Input dédié aux tags d'article. Charge la liste des tags de l'organisation
 * au montage pour proposer une auto-complétion via le ChipsInput partagé.
 * Si l'API échoue, on tombe en mode saisie libre sans suggestions.
 */
export function TagsInput({ value, onChange, max = 10, disabled, id, describedBy }: TagsInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    tagsApi.list()
      .then(tags => { if (alive) setSuggestions(tags.map(t => t.display_name)); })
      .catch(() => { /* mode dégradé : pas de suggestions */ });
    return () => { alive = false; };
  }, []);

  return (
    <ChipsInput
      value={value}
      onChange={onChange}
      placeholder="Ajouter un tag (Black Friday, urgent…)"
      suggestions={suggestions}
      max={max}
      disabled={disabled}
      id={id}
      describedBy={describedBy}
    />
  );
}
