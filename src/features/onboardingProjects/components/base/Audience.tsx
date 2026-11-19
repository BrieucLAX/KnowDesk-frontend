import { FilterTabs } from '../../../../shared/components/ui/FilterTabs';
import {
  AUDIENCE_FILTERS, AUDIENCE_LABEL, audienceOf, matchesAudience, type AudienceFilter as Filter,
} from '../../lib/audience';

/**
 * Le public d'un article (plan, articles rédigés) : une étiquette « Particuliers »,
 * « Professionnels » ou « Particuliers et professionnels » ; une valeur libre d'un plan plus
 * ancien s'affiche comme avant, « Public : … » ; rien sans valeur.
 */
export function AudienceTag({ value }: { value: string | null }) {
  const audience = audienceOf(value);
  if (audience !== null) {
    return <span className={`obp-audience obp-audience--${audience}`}>{AUDIENCE_LABEL[audience]}</span>;
  }
  return value ? <span>Public : {value}</span> : null;
}

/** Le filtre par public, avec le nombre d'articles de chaque choix. */
export function AudienceFilter({ values, value, onChange }: {
  values: ReadonlyArray<string | null>; value: Filter; onChange: (f: Filter) => void;
}) {
  return (
    <FilterTabs
      ariaLabel="Filtrer les articles par public"
      value={value}
      onChange={onChange}
      options={AUDIENCE_FILTERS.map(o => ({ ...o, count: values.filter(v => matchesAudience(v, o.id)).length }))}
    />
  );
}
