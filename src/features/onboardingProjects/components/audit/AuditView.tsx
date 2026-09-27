import React from 'react';
import { groupQuestions, questionKind, type Audit } from '../../lib/audit';
import { detectionLabel, discardReasonLabel, impactLabel, unpairedReasonLabel } from '../../lib/auditLabels';
import { AuditQuestionGroup } from './AuditQuestion';
import { AuditSource } from './AuditSource';

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

function Section({ id, title, count, children }: { id: string; title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="obp-audit-section" aria-labelledby={id}>
      <h3 id={id} className="obp-section-title">
        {title}{count !== undefined && <span className="obp-count">{count}</span>}
      </h3>
      {children}
    </section>
  );
}

/** Liste repliée par défaut : lisible sur demande, jamais retirée. */
function Folded({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details className="obp-audit-folded">
      <summary>{summary}</summary>
      {children}
    </details>
  );
}

/**
 * Une détection que le pipeline ne produit pas encore s'affiche « non
 * disponible », jamais « aucun » : une liste vide ne veut rien dire.
 */
function Detection({ audit, name, children, count }: {
  audit: Audit; name: string; count: number; children: React.ReactNode;
}) {
  const id = `obp-audit-${name}`;
  if (audit.unavailableDetections.has(name)) {
    return (
      <Section id={id} title={detectionLabel(name)}>
        <p className="obp-muted">Non disponible : cette version de l'analyse ne les recherche pas encore.</p>
      </Section>
    );
  }
  return (
    <Section id={id} title={detectionLabel(name)} count={count}>
      {count === 0 ? <p className="obp-muted">Aucune trouvée.</p> : children}
    </Section>
  );
}

/** L'audit, en lecture seule, dans l'ordre où le pipeline le livre. */
export function AuditView({ audit }: { audit: Audit }) {
  const { summary } = audit;
  const decisions = groupQuestions(audit.questions.filter(q => questionKind(audit, q) === 'decision'));
  const toVerify  = groupQuestions(audit.questions.filter(q => questionKind(audit, q) === 'to_verify'));
  const toConfirm = groupQuestions(audit.questions.filter(q => questionKind(audit, q) === 'to_confirm'));
  const impacts = (['high', 'medium', 'low'] as const)
    .filter(level => (summary.byImpact[level] ?? 0) > 0)
    .map(level => `${impactLabel(level).toLowerCase()} : ${summary.byImpact[level]}`);
  const unpairedTotal = audit.unpaired.reduce((n, u) => n + u.count, 0);

  return (
    <div className="obp-audit">
      <dl className="obp-audit-summary">
        <div>
          <dt>Décisions à prendre</dt>
          <dd>{summary.count}</dd>
        </div>
        {audit.estimatedMinutes !== null && (
          <div>
            <dt>Durée estimée</dt>
            <dd>{audit.estimatedMinutes} min</dd>
          </div>
        )}
        <div>
          <dt>Points à vérifier</dt>
          <dd>{summary.toVerifyCount}</dd>
        </div>
        <div>
          <dt>Cas à confirmer</dt>
          <dd>{summary.toConfirmCount}</dd>
        </div>
        <div>
          <dt>Résolus automatiquement</dt>
          <dd>{summary.autoResolvedCount}</dd>
        </div>
      </dl>
      <p className="obp-muted">
        {plural(summary.count, 'décision est annoncée', 'décisions sont annoncées')}
        {impacts.length > 0 && ` (${impacts.join(', ')})`}.
        {' '}Les points à vérifier et les cas à confirmer sont listés à part : ils ne bloquent pas la publication.
      </p>

      <Section id="obp-audit-decisions" title="Décisions à prendre" count={decisions.length}>
        {decisions.length === 0
          ? <p className="obp-muted">Aucune décision à prendre.</p>
          : decisions.map((g, i) => <AuditQuestionGroup key={g[0].id} audit={audit} group={g} title={`Décision ${i + 1}`} />)}
      </Section>

      {toVerify.length > 0 && (
        <Section id="obp-audit-to-verify" title="Points à vérifier visuellement" count={toVerify.length}>
          <p className="obp-muted">Un des côtés a été lu dans une image : comparez l'extrait à l'image avant de trancher.</p>
          {toVerify.map((g, i) => <AuditQuestionGroup key={g[0].id} audit={audit} group={g} title={`Point à vérifier ${i + 1}`} />)}
        </Section>
      )}

      {toConfirm.length > 0 && (
        <Section id="obp-audit-to-confirm" title="Cas à confirmer" count={toConfirm.length}>
          <p className="obp-muted">Ces valeurs semblent s'appliquer à des cas différents : il reste à le confirmer.</p>
          {toConfirm.map((g, i) => (
            <AuditQuestionGroup key={g[0].id} audit={audit} group={g} title={`Cas à confirmer ${i + 1}`} showProposedCondition />
          ))}
        </Section>
      )}

      <Section id="obp-audit-automatic" title="Écarts résolus automatiquement" count={audit.automaticDecisions.length}>
        {audit.automaticDecisions.length === 0 ? <p className="obp-muted">Aucun.</p> : (
          <>
            <p className="obp-muted">Versions successives d'un même document : la plus récente a été retenue.</p>
            <ul className="obp-audit-list">
              {audit.automaticDecisions.map(d => (
                <li key={d.id} className="obp-audit-card">
                  {d.rationale && <p className="obp-audit-question__text">{d.rationale}</p>}
                  {d.evidence.map((s, j) => <AuditSource key={j} audit={audit} source={s} />)}
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>

      <Section id="obp-audit-discarded" title="Écarts écartés" count={audit.discardedGaps.length}>
        {audit.discardedGaps.length === 0 ? <p className="obp-muted">Aucun.</p> : (
          <Folded summary="Voir les écarts écartés et leur raison">
            <ul className="obp-audit-list">
              {audit.discardedGaps.map(g => (
                <li key={g.id} className="obp-audit-item">
                  <p className="obp-audit-item__title">{g.subject} <span className="obp-audit-tag">{discardReasonLabel(g.reason)}</span></p>
                  <p className="obp-muted">{g.explanation}</p>
                </li>
              ))}
            </ul>
          </Folded>
        )}
      </Section>

      <Section id="obp-audit-complementary" title="Textes complémentaires" count={audit.complementaryTexts.length}>
        {audit.complementaryTexts.length === 0 ? <p className="obp-muted">Aucun.</p> : (
          <Folded summary="Voir les textes jugés compatibles">
            <ul className="obp-audit-list">
              {audit.complementaryTexts.map(c => (
                <li key={c.id} className="obp-audit-item">
                  <p className="obp-audit-item__title">{c.subject}</p>
                  <p className="obp-muted">{c.rationale}</p>
                </li>
              ))}
            </ul>
          </Folded>
        )}
      </Section>

      <Section id="obp-audit-unpaired" title="Faits jamais comparés" count={unpairedTotal}>
        {audit.unpaired.length === 0 ? <p className="obp-muted">Aucun.</p> : (
          <ul className="obp-audit-list">
            {audit.unpaired.map(u => (
              <li key={u.reason} className="obp-audit-item">
                <p className="obp-audit-item__title">{unpairedReasonLabel(u.reason)} : {u.count}</p>
                <p className="obp-muted">{u.explanation}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Detection audit={audit} name="undefined_references" count={audit.undefinedReferences.length}>
        <ul className="obp-audit-list">
          {audit.undefinedReferences.map(r => (
            <li key={r.id} className="obp-audit-item">
              <p className="obp-audit-item__title">{r.label}</p>
              {r.source && <AuditSource audit={audit} source={r.source} />}
            </li>
          ))}
        </ul>
      </Detection>

      <Detection audit={audit} name="obsolescence_hints" count={audit.obsolescenceHints.length}>
        <ul className="obp-audit-list">
          {audit.obsolescenceHints.map(h => (
            <li key={h.id} className="obp-audit-item">
              <p className="obp-audit-item__title">{h.signal}</p>
              {h.source && <AuditSource audit={audit} source={h.source} />}
            </li>
          ))}
        </ul>
      </Detection>
    </div>
  );
}
