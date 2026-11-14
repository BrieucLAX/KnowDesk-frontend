import { describe, it, expect } from 'vitest';
import {
  buildFailureMessage, buildStepStates, buildSummary, EMPTY_LABEL, readConstruction, REMOVED_LABEL, removedLabel,
  SUPPORTED_BUILD_SCHEMAS, TO_VERIFY_LABEL, UNCOVERED_KINDS,
} from './build';
import VERSIONS from './contract-versions.json';
import BUILD_ELYRA from '../components/base/fixtures/construction-0.1.0-elyra.response.json';

/**
 * Construction 0.1.0 (plan-construire-v1, lot C). La fixture est écrite d'après le schéma publié
 * par le pipeline, sur les documents et les cartes réels de la lecture 4 d'Elyra (aucun pipeline ne
 * rédige encore) ; ce test la valide contre le schéma consigné du back voisin, ou, à défaut, contre
 * celui du pipeline voisin.
 */
const SCHEMAS = {
  ...import.meta.glob<unknown>('../../../../../KnowDesk-pipeline/schemas/construction-*.schema.json', { eager: true, import: 'default' }),
  ...import.meta.glob<unknown>('../../../../../KnowDesk/src/modules/onboarding/schemas/construction-*.schema.json', { eager: true, import: 'default' }),
};
const SCHEMA = Object.entries(SCHEMAS).find(([path]) => path.includes('/KnowDesk/'))?.[1] ?? Object.values(SCHEMAS)[0];

type Schema = {
  $ref?: string; type?: string | string[]; properties?: Record<string, Schema>; required?: string[];
  additionalProperties?: boolean; enum?: unknown[]; const?: unknown; anyOf?: Schema[]; oneOf?: Schema[];
  items?: Schema; minItems?: number; maxItems?: number; minLength?: number; maxLength?: number; pattern?: string; minimum?: number;
  $defs?: Record<string, Schema>;
};

/**
 * Un validateur réduit aux mots du schéma publié (aucune dépendance ajoutée) : `$ref`, `type`,
 * `properties`, `required`, `additionalProperties`, `enum`, `const`, `anyOf`, `oneOf`, `items`,
 * bornes de longueur et de nombre, `pattern`. Rend la liste des écarts, chemin compris.
 */
function validate(root: Schema, node: Schema, value: unknown, path = '$'): string[] {
  if (node.$ref) return validate(root, root.$defs![node.$ref.replace('#/$defs/', '')], value, path);
  if (node.anyOf) return node.anyOf.some(n => validate(root, n, value, path).length === 0) ? [] : [`${path} : aucun choix de anyOf`];
  if (node.oneOf) {
    const ok = node.oneOf.filter(n => validate(root, n, value, path).length === 0).length;
    return ok === 1 ? [] : [`${path} : ${ok} choix de oneOf au lieu d'un`];
  }
  const errors: string[] = [];
  const types = node.type === undefined ? [] : Array.isArray(node.type) ? node.type : [node.type];
  const kind = value === null ? 'null' : Array.isArray(value) ? 'array' : Number.isInteger(value) ? 'integer' : typeof value;
  if (types.length > 0 && !types.some(t => t === kind || (t === 'number' && kind === 'integer'))) return [`${path} : ${kind} au lieu de ${types.join('|')}`];
  if (node.const !== undefined && value !== node.const) errors.push(`${path} : ${String(value)} ≠ ${String(node.const)}`);
  if (node.enum && !node.enum.includes(value)) errors.push(`${path} : ${String(value)} hors de la liste`);
  if (typeof value === 'string') {
    if (node.minLength !== undefined && value.length < node.minLength) errors.push(`${path} : trop court`);
    if (node.maxLength !== undefined && value.length > node.maxLength) errors.push(`${path} : trop long`);
    if (node.pattern && !new RegExp(node.pattern).test(value)) errors.push(`${path} : motif`);
  }
  if (typeof value === 'number' && node.minimum !== undefined && value < node.minimum) errors.push(`${path} : sous le minimum`);
  if (Array.isArray(value)) {
    if (node.minItems !== undefined && value.length < node.minItems) errors.push(`${path} : trop peu d'éléments`);
    if (node.maxItems !== undefined && value.length > node.maxItems) errors.push(`${path} : trop d'éléments`);
    if (node.items) value.forEach((v, i) => errors.push(...validate(root, node.items!, v, `${path}[${i}]`)));
  }
  if (kind === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of node.required ?? []) if (!(key in obj)) errors.push(`${path}.${key} : manquant`);
    for (const [key, v] of Object.entries(obj)) {
      const prop = node.properties?.[key];
      if (prop) errors.push(...validate(root, prop, v, `${path}.${key}`));
      else if (node.additionalProperties === false) errors.push(`${path}.${key} : champ inconnu`);
    }
  }
  return errors;
}

const RAW = BUILD_ELYRA.construction as unknown;

describe('Construction 0.1.0 : la fixture d\'Elyra suit le contrat', () => {
  it('chaque rédaction acceptée par le back s\'affiche', () => {
    expect([...SUPPORTED_BUILD_SCHEMAS]).toEqual(VERSIONS.builds.accepted);
    expect(BUILD_ELYRA.schemaVersion).toBe('0.1.0');
  });

  it.skipIf(SCHEMA === undefined)('valide contre le schéma publié', () => {
    const schema = SCHEMA as Schema;
    expect(validate(schema, schema, RAW)).toEqual([]);
  });

  it.skipIf(SCHEMA === undefined)('le validateur refuse ce que le schéma refuse', () => {
    const schema = SCHEMA as Schema;
    const broken = JSON.parse(JSON.stringify(RAW)) as { articles: Array<{ removed?: Array<{ reason: string }> }>; uncovered: Array<{ kind: string }> };
    broken.articles[0].removed![0].reason = 'pas convaincant';
    broken.uncovered[0].kind = 'autre';
    expect(validate(schema, schema, broken).length).toBe(2);
  });

  it.skipIf(SCHEMA === undefined)('les listes fermées de l\'écran sont celles du schéma', () => {
    const defs = (SCHEMA as Schema).$defs!;
    const values = (n: Schema | undefined): unknown[] => [
      ...(n?.enum ?? []), ...(n?.anyOf ?? []).flatMap(values),
    ];
    expect(values(defs.ToVerify.properties!.reason).sort()).toEqual(Object.keys(TO_VERIFY_LABEL).sort());
    expect(values(defs.RemovedBlock.properties!.reason).sort()).toEqual(Object.keys(REMOVED_LABEL).sort());
    expect(values(defs.BuiltArticle.properties!.empty_reason).filter(v => v !== null).sort()).toEqual(Object.keys(EMPTY_LABEL).sort());
    expect(values(defs.UncoveredPoint.properties!.kind).sort()).toEqual([...UNCOVERED_KINDS].sort());
  });
});

describe('readConstruction', () => {
  const c = readConstruction(RAW)!;

  it('lit les catégories et leurs articles, dans l\'ordre', () => {
    expect(c.chapters.map(ch => ch.title)).toEqual(['Offres et prix', 'Souscription et résiliation', 'Service client']);
    expect(c.chapters[0].articles.map(a => a.title)).toEqual(['Prix d\'Elyra Fixe 2 ans', 'Offre Gaz Indexé', 'Le parrainage', 'Tarifs 2025']);
    expect(c.articleCount).toBe(6);
    expect(c.writtenCount).toBe(5);
  });

  it('chaque bloc des documents garde ses sources ; le texte de l\'expert n\'en a aucune', () => {
    const parrainage = c.chapters[0].articles[2];
    expect(parrainage.blocks[0].sources.map(s => s.documentId)).toEqual([
      'doc_cr_comite_offres_2026_09_22_docx_c63de454', 'doc_argumentaire_commercial_tpe_artisans_docx_7a98ac63',
    ]);
    expect(parrainage.blocks[0].toVerify).toEqual([
      { reason: 'joined_passages', passages: ['La remise s\'applique si le filleul souscrit Elyra Pro Sérénité.'] },
    ]);
    expect(parrainage.blocks[1]).toMatchObject({ fromExpert: true, sources: [], expert: { enteredOn: '2026-11-13' } });
  });

  it('compte les phrases à vérifier, les textes de l\'expert et les points non couverts', () => {
    expect(buildSummary(c)).toBe('6 articles · 2 phrases à vérifier · 1 texte saisi par l\'expert · 5 points non couverts');
    expect(c.uncovered.find(p => p.kind === 'value_without_source')?.removedText).toBe('Une résiliation avant 12 mois coûte 75 € TTC.');
  });

  it('un contenu illisible donne null ; une raison inconnue est ignorée, jamais affichée', () => {
    expect(readConstruction(null)).toBeNull();
    expect(readConstruction({ chapters: [] })).toBeNull();
    const raw = JSON.parse(JSON.stringify(RAW)) as { uncovered: Array<{ kind: string }> };
    raw.uncovered[0].kind = 'nouvelle_raison';
    expect(readConstruction(raw)!.uncovered).toHaveLength(4);
  });

  it('la raison d\'un retrait nomme la carte qui l\'a décidé', () => {
    expect(removedLabel({ reason: 'discarded_source', cardId: 'c1' }, () => 'Montant du parrainage'))
      .toBe('passage écarté par votre réponse à la carte « Montant du parrainage ».');
    expect(removedLabel({ reason: 'value_without_source', cardId: null }, () => '')).toBe('valeur qu\'aucune source citée ne donne.');
  });
});

describe('Avancement et échecs', () => {
  it('les étapes suivent le pipeline, puis l\'enregistrement du back', () => {
    expect(buildStepStates({ status: 'running', stage: 'build' })).toEqual(['done', 'current', 'pending', 'pending']);
    expect(buildStepStates({ status: 'running', stage: 'parsing' })).toEqual(['current', 'pending', 'pending', 'pending']);
    expect(buildStepStates({ status: 'succeeded', stage: 'storing' })).toEqual(['done', 'done', 'done', 'done']);
  });

  it('un pipeline qui ne connaît pas la tâche : message clair, hors quota', () => {
    expect(buildFailureMessage('build_not_supported')).toBe(
      'La rédaction n\'est pas encore disponible : réessayez plus tard. Elle ne compte pas dans votre quota : vous pouvez la relancer.',
    );
    expect(buildFailureMessage('build_invalid')).toMatch(/problème de notre côté.*ne compte pas dans votre quota/);
    expect(buildFailureMessage(null)).toMatch(/^La rédaction a échoué\. Elle ne compte pas/);
  });
});
