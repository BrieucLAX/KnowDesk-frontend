import React from 'react';
import { Button } from '../../../shared/components/ui/Button';
import { Input }  from '../../../shared/components/ui/Input';
import { CADRAGE_LIMITS, CADRAGE_SECTIONS, type CadrageErrors, type CadrageSectionKey } from '../lib/cadrageForm';
import { TextArea } from './TextArea';
import type { CadrageForm, NamedItem, OnboardingDocument } from '../types';

/**
 * Les six sections de la fiche de cadrage (celles du cadrage pilote). Toute
 * section peut rester vide. Les sections 5 et 6 citent des documents
 * importés dans le projet.
 */

export interface SectionProps {
  form:      CadrageForm;
  errors:    CadrageErrors;
  documents: OnboardingDocument[];
  /** Applique une modification sur une copie du formulaire. */
  edit:      (mutate: (draft: CadrageForm) => void) => void;
  readOnly?: boolean;
}

const HINTS: Record<CadrageSectionKey, string> = {
  offers:           'Ce que vous vendez : offres, gammes, abonnements.',
  segments:         'Les types de clients que vous servez (particuliers, professionnels…).',
  services:         'Les services et activités que couvre votre service client. « En préparation » : pas encore actif.',
  notions:          'Deux termes proches que vos documents ne doivent pas confondre, et ce qui les distingue.',
  sourceHierarchy:  'Quand deux sources se contredisent, laquelle fait foi ? Classez les niveaux du plus fort au plus faible et rattachez-y vos documents.',
  limitedDocuments: 'Un document valable sur une période (offre temporaire, mesure exceptionnelle) : il remplace ou suspend les autres sources sur son périmètre.',
};

function SectionFrame({ sectionKey, errorCount, children }: {
  sectionKey: CadrageSectionKey; errorCount: number; children: React.ReactNode;
}) {
  const s = CADRAGE_SECTIONS.find(x => x.key === sectionKey)!;
  return (
    <fieldset className="obp-cadrage-section" id={`obp-section-${sectionKey}`}>
      <legend className="obp-cadrage-section__title">
        {s.number}. {s.title}
        {errorCount > 0 && (
          <span className="obp-cadrage-section__errors">
            {errorCount} erreur{errorCount > 1 ? 's' : ''}
          </span>
        )}
      </legend>
      <p className="obp-muted">{HINTS[sectionKey]}</p>
      {children}
    </fieldset>
  );
}

function ItemFrame({ title, onRemove, readOnly, children }: {
  title: string; onRemove: () => void; readOnly?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="obp-cadrage-item">
      <div className="obp-cadrage-item__head">
        <span className="obp-cadrage-item__title">{title}</span>
        {!readOnly && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label={`Retirer : ${title}`}>
            Retirer
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

function AddButton({ label, count, max, onAdd, readOnly }: {
  label: string; count: number; max: number; onAdd: () => void; readOnly?: boolean;
}) {
  if (readOnly) return null;
  return (
    <div>
      <Button type="button" variant="secondary" size="sm" onClick={onAdd} disabled={count >= max}>
        + {label}
      </Button>
      {count >= max && <span className="obp-muted"> {max} au plus.</span>}
    </div>
  );
}

// ── Sections 1 à 3 : listes nommées ──────────────────────────

function NamedListSection({ sectionKey, itemLabel, addLabel, max, props, withStatus }: {
  sectionKey: 'offers' | 'segments' | 'services';
  itemLabel:  string;
  addLabel:   string;
  max:        number;
  props:      SectionProps;
  withStatus?: boolean;
}) {
  const { form, errors, edit, readOnly } = props;
  const items: NamedItem[] = form[sectionKey];
  const count = Object.keys(errors).filter(k => k.startsWith(`${sectionKey}.`) || k === sectionKey).length;
  const err = (i: number, field: string) => errors[`${sectionKey}.${i}.${field}`];

  return (
    <SectionFrame sectionKey={sectionKey} errorCount={count}>
      {errors[sectionKey] && <p className="field-error" role="alert">{errors[sectionKey]}</p>}
      {items.map((item, i) => (
        <ItemFrame
          key={i}
          title={item.name.trim() || `${itemLabel} ${i + 1}`}
          readOnly={readOnly}
          onRemove={() => edit(d => { d[sectionKey].splice(i, 1); })}
        >
          <Input
            id={`obp-${sectionKey}-${i}-name`}
            label="Nom"
            value={item.name}
            maxLength={CADRAGE_LIMITS.name}
            readOnly={readOnly}
            error={err(i, 'name')}
            onChange={e => edit(d => { d[sectionKey][i].name = e.target.value; })}
          />
          <TextArea
            id={`obp-${sectionKey}-${i}-description`}
            label="Description"
            value={item.description}
            maxLength={CADRAGE_LIMITS.paragraph}
            readOnly={readOnly}
            error={err(i, 'description')}
            onChange={e => edit(d => { d[sectionKey][i].description = e.target.value; })}
          />
          {withStatus && sectionKey === 'services' && (
            <div className="obp-radio-row" role="radiogroup" aria-label="Statut du service">
              {(['active', 'upcoming'] as const).map(status => (
                <label key={status} className="obp-radio">
                  <input
                    type="radio"
                    name={`obp-services-${i}-status`}
                    checked={form.services[i].status === status}
                    disabled={readOnly}
                    onChange={() => edit(d => { d.services[i].status = status; })}
                  />
                  {status === 'active' ? 'Actif' : 'En préparation'}
                </label>
              ))}
            </div>
          )}
        </ItemFrame>
      ))}
      <AddButton
        label={addLabel}
        count={items.length}
        max={max}
        readOnly={readOnly}
        onAdd={() => edit(d => {
          if (sectionKey === 'services') d.services.push({ name: '', description: '', status: 'active' });
          else d[sectionKey].push({ name: '', description: '' });
        })}
      />
    </SectionFrame>
  );
}

export function OffersSection(props: SectionProps) {
  return <NamedListSection sectionKey="offers" itemLabel="Offre" addLabel="Ajouter une offre" max={CADRAGE_LIMITS.offers} props={props} />;
}

export function SegmentsSection(props: SectionProps) {
  return <NamedListSection sectionKey="segments" itemLabel="Segment" addLabel="Ajouter un segment" max={CADRAGE_LIMITS.segments} props={props} />;
}

export function ServicesSection(props: SectionProps) {
  return <NamedListSection sectionKey="services" itemLabel="Service" addLabel="Ajouter un service" max={CADRAGE_LIMITS.services} props={props} withStatus />;
}

// ── Section 4 : notions à ne pas confondre ───────────────────

export function NotionsSection({ form, errors, edit, readOnly }: SectionProps) {
  const count = Object.keys(errors).filter(k => k.startsWith('notions')).length;
  const err = (i: number, f: string) => errors[`notions.${i}.${f}`];
  return (
    <SectionFrame sectionKey="notions" errorCount={count}>
      {errors.notions && <p className="field-error" role="alert">{errors.notions}</p>}
      {form.notions.map((n, i) => (
        <ItemFrame
          key={i}
          title={n.first.trim() && n.second.trim() ? `${n.first.trim()} ≠ ${n.second.trim()}` : `Paire ${i + 1}`}
          readOnly={readOnly}
          onRemove={() => edit(d => { d.notions.splice(i, 1); })}
        >
          <div className="obp-grid-2">
            <Input id={`obp-notions-${i}-first`} label="Première notion" value={n.first} maxLength={CADRAGE_LIMITS.name}
              readOnly={readOnly} error={err(i, 'first')} onChange={e => edit(d => { d.notions[i].first = e.target.value; })} />
            <Input id={`obp-notions-${i}-second`} label="À ne pas confondre avec" value={n.second} maxLength={CADRAGE_LIMITS.name}
              readOnly={readOnly} error={err(i, 'second')} onChange={e => edit(d => { d.notions[i].second = e.target.value; })} />
          </div>
          <TextArea id={`obp-notions-${i}-explanation`} label="Ce qui les distingue" value={n.explanation}
            maxLength={CADRAGE_LIMITS.paragraph} readOnly={readOnly} error={err(i, 'explanation')}
            onChange={e => edit(d => { d.notions[i].explanation = e.target.value; })} />
        </ItemFrame>
      ))}
      <AddButton label="Ajouter une paire" count={form.notions.length} max={CADRAGE_LIMITS.notions} readOnly={readOnly}
        onAdd={() => edit(d => { d.notions.push({ first: '', second: '', explanation: '' }); })} />
    </SectionFrame>
  );
}

// ── Section 5 : hiérarchie des sources ───────────────────────

export function SourceHierarchySection({ form, errors, documents, edit, readOnly }: SectionProps) {
  const { levels, specialCases } = form.sourceHierarchy;
  const count = Object.keys(errors).filter(k => k.startsWith('sourceHierarchy')).length;
  const err = (path: string) => errors[`sourceHierarchy.${path}`];

  /** Niveau (index) où chaque document est déjà rangé, par nom de fichier. */
  const levelOf = new Map<string, number>();
  levels.forEach((l, i) => l.documents.forEach(name => { if (!levelOf.has(name)) levelOf.set(name, i); }));
  const projectNames = documents.map(d => d.filename);
  const inProject = new Set(projectNames);

  const move = (i: number, delta: -1 | 1) => edit(d => {
    const list = d.sourceHierarchy.levels;
    const [item] = list.splice(i, 1);
    list.splice(i + delta, 0, item);
  });

  return (
    <SectionFrame sectionKey="sourceHierarchy" errorCount={count}>
      {err('levels') && <p className="field-error" role="alert">{err('levels')}</p>}
      {levels.map((l, i) => (
        <div key={i} className="obp-cadrage-item">
          <div className="obp-cadrage-item__head">
            <span className="obp-cadrage-item__title">Niveau {i + 1}{l.label.trim() ? ` — ${l.label.trim()}` : ''}</span>
            {!readOnly && (
              <span className="obp-cadrage-item__actions">
                <Button type="button" variant="ghost" size="sm" disabled={i === 0} onClick={() => move(i, -1)}
                  aria-label={`Monter le niveau ${i + 1}`}>↑</Button>
                <Button type="button" variant="ghost" size="sm" disabled={i === levels.length - 1} onClick={() => move(i, 1)}
                  aria-label={`Descendre le niveau ${i + 1}`}>↓</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => edit(d => { d.sourceHierarchy.levels.splice(i, 1); })}
                  aria-label={`Retirer le niveau ${i + 1}`}>Retirer</Button>
              </span>
            )}
          </div>
          <Input id={`obp-levels-${i}-label`} label="Intitulé" value={l.label} maxLength={CADRAGE_LIMITS.name}
            readOnly={readOnly} error={err(`levels.${i}.label`)}
            onChange={e => edit(d => { d.sourceHierarchy.levels[i].label = e.target.value; })} />
          <TextArea id={`obp-levels-${i}-detail`} label="Précisions" value={l.detail} maxLength={CADRAGE_LIMITS.paragraph}
            readOnly={readOnly} error={err(`levels.${i}.detail`)}
            onChange={e => edit(d => { d.sourceHierarchy.levels[i].detail = e.target.value; })} />
          <div className="field" role="group" aria-labelledby={`obp-levels-${i}-docs`}>
            <span id={`obp-levels-${i}-docs`} className="field-label">Documents de ce niveau</span>
            {documents.length === 0 && l.documents.length === 0 ? (
              <p className="obp-muted">Importez des documents pour les rattacher à un niveau.</p>
            ) : (
              <div className="obp-doc-picks">
                {/* Documents du projet, puis ceux que ce niveau cite mais qui en sont absents. */}
                {[...projectNames, ...l.documents.filter(name => !inProject.has(name))].map(name => {
                  const elsewhere = levelOf.get(name);
                  const checked = l.documents.includes(name);
                  const taken = !checked && elsewhere !== undefined && elsewhere !== i;
                  const absent = !inProject.has(name);
                  return (
                    <label key={name} className={`obp-doc-pick${taken ? ' is-taken' : ''}${absent ? ' is-absent' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={readOnly || taken}
                        onChange={e => edit(d => {
                          const names = d.sourceHierarchy.levels[i].documents;
                          if (e.target.checked) names.push(name);
                          else names.splice(names.indexOf(name), 1);
                        })}
                      />
                      <span>{name}</span>
                      {taken && <span className="obp-muted"> (niveau {elsewhere! + 1})</span>}
                      {absent && <span className="obp-absent">absent du projet</span>}
                    </label>
                  );
                })}
              </div>
            )}
            {err(`levels.${i}.documents`) && <p className="field-error" role="alert">{err(`levels.${i}.documents`)}</p>}
          </div>
        </div>
      ))}
      <AddButton label="Ajouter un niveau" count={levels.length} max={CADRAGE_LIMITS.levels} readOnly={readOnly}
        onAdd={() => edit(d => { d.sourceHierarchy.levels.push({ label: '', detail: '', documents: [] }); })} />

      <div className="obp-cadrage-sub">
        <span className="field-label">Cas particuliers</span>
        {err('specialCases') && <p className="field-error" role="alert">{err('specialCases')}</p>}
        {specialCases.map((c, i) => (
          <div key={i} className="obp-inline-row">
            <Input id={`obp-special-${i}`} label={`Cas particulier ${i + 1}`} value={c} maxLength={CADRAGE_LIMITS.specialCase}
              readOnly={readOnly} error={err(`specialCases.${i}`)}
              onChange={e => edit(d => { d.sourceHierarchy.specialCases[i] = e.target.value; })} />
            {!readOnly && (
              <Button type="button" variant="ghost" size="sm" onClick={() => edit(d => { d.sourceHierarchy.specialCases.splice(i, 1); })}
                aria-label={`Retirer le cas particulier ${i + 1}`}>Retirer</Button>
            )}
          </div>
        ))}
        <AddButton label="Ajouter un cas particulier" count={specialCases.length} max={CADRAGE_LIMITS.specialCases} readOnly={readOnly}
          onAdd={() => edit(d => { d.sourceHierarchy.specialCases.push(''); })} />
      </div>
    </SectionFrame>
  );
}

// ── Section 6 : documents à durée limitée ────────────────────

export function LimitedDocumentsSection({ form, errors, documents, edit, readOnly }: SectionProps) {
  const count = Object.keys(errors).filter(k => k.startsWith('limitedDocuments')).length;
  const err = (i: number, f: string) => errors[`limitedDocuments.${i}.${f}`];
  const inProject = new Set(documents.map(d => d.filename));

  return (
    <SectionFrame sectionKey="limitedDocuments" errorCount={count}>
      {errors.limitedDocuments && <p className="field-error" role="alert">{errors.limitedDocuments}</p>}
      {form.limitedDocuments.map((ld, i) => (
        <ItemFrame
          key={i}
          title={ld.document || `Document ${i + 1}`}
          readOnly={readOnly}
          onRemove={() => edit(d => { d.limitedDocuments.splice(i, 1); })}
        >
          <div className="field">
            <label htmlFor={`obp-limited-${i}-doc`} className="field-label">Document</label>
            <select
              id={`obp-limited-${i}-doc`}
              className={`field-input${err(i, 'document') ? ' field-input--error' : ''}`}
              value={ld.document}
              disabled={readOnly}
              aria-invalid={!!err(i, 'document')}
              onChange={e => edit(d => { d.limitedDocuments[i].document = e.target.value; })}
            >
              <option value="">Choisir un document…</option>
              {documents.map(doc => <option key={doc.id} value={doc.filename}>{doc.filename}</option>)}
              {ld.document && !inProject.has(ld.document) && (
                <option value={ld.document}>{ld.document} (absent du projet)</option>
              )}
            </select>
            {ld.document && !inProject.has(ld.document) && (
              <p className="obp-absent-note">
                Ce document n'est plus dans le projet. Réimportez-le sous le même nom pour qu'il reprenne sa place.
              </p>
            )}
            {err(i, 'document') && <p className="field-error" role="alert">{err(i, 'document')}</p>}
          </div>
          <div className="obp-grid-2">
            <Input id={`obp-limited-${i}-from`} label="Valable à partir du" type="date" value={ld.validFrom ?? ''}
              readOnly={readOnly} error={err(i, 'validFrom')}
              onChange={e => edit(d => { d.limitedDocuments[i].validFrom = e.target.value || null; })} />
            <Input id={`obp-limited-${i}-until`} label="Jusqu'au" type="date" value={ld.validUntil ?? ''}
              readOnly={readOnly} error={err(i, 'validUntil')}
              onChange={e => edit(d => { d.limitedDocuments[i].validUntil = e.target.value || null; })} />
          </div>
          <div className="obp-radio-row" role="radiogroup" aria-label="Effet sur les autres sources">
            {([
              ['replaces', 'Remplace les autres sources'],
              ['suspends', 'Suspend les autres sources, sans les remplacer'],
            ] as const).map(([effect, label]) => (
              <label key={effect} className="obp-radio">
                <input type="radio" name={`obp-limited-${i}-effect`} checked={ld.effect === effect} disabled={readOnly}
                  onChange={() => edit(d => { d.limitedDocuments[i].effect = effect; })} />
                {label}
              </label>
            ))}
          </div>
          <TextArea id={`obp-limited-${i}-scope`} label="Périmètre" value={ld.scope} maxLength={CADRAGE_LIMITS.paragraph}
            readOnly={readOnly} error={err(i, 'scope')}
            placeholder="Sur quoi porte ce document : offres, clients, cas concernés."
            onChange={e => edit(d => { d.limitedDocuments[i].scope = e.target.value; })} />
        </ItemFrame>
      ))}
      {documents.length === 0 && !readOnly ? (
        <p className="obp-muted">Importez des documents pour en désigner un.</p>
      ) : (
        <AddButton label="Ajouter un document" count={form.limitedDocuments.length} max={CADRAGE_LIMITS.limitedDocuments} readOnly={readOnly}
          onAdd={() => edit(d => { d.limitedDocuments.push({ document: '', validFrom: null, validUntil: null, effect: 'replaces', scope: '' }); })} />
      )}
    </SectionFrame>
  );
}

/** Les six sections dans l'ordre du cadrage pilote. */
export function CadrageSections(props: SectionProps) {
  return (
    <>
      <OffersSection {...props} />
      <SegmentsSection {...props} />
      <ServicesSection {...props} />
      <NotionsSection {...props} />
      <SourceHierarchySection {...props} />
      <LimitedDocumentsSection {...props} />
    </>
  );
}
