import React, { useState, useCallback } from 'react';
import { useApiKeys }       from '../hooks/useApiKeys';
import { Button }           from '../../../shared/components/ui/Button';
import { Input }            from '../../../shared/components/ui/Input';
import { Modal }            from '../../../shared/components/ui/Modal';
import { ConfirmDialog }    from '../../../shared/components/ui/ConfirmDialog';
import { SettingsListSection } from '../../../shared/components/ui/SettingsListSection';
import { formatRelative }   from '../../../shared/lib/formatDate';
import { Check, TriangleAlert, X } from 'lucide-react';

export function ApiKeysSection() {
  const { keys, loading, newKey, setNewKey, createKey, revokeKey } = useApiKeys();
  const [showCreate,   setShowCreate]   = useState(false);
  const [name,         setName]         = useState('');
  const [creating,     setCreating]     = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    setCreating(true);
    const ok = await createKey(name.trim());
    if (ok) {
      setName('');
      setShowCreate(false);
    }
    setCreating(false);
  }, [name, createKey]);

  const handleCopy = useCallback(() => {
    if (!newKey) return;
    navigator.clipboard?.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [newKey]);

  return (
    <SettingsListSection
      title="Clés API"
      description="Utilisez ces clés pour accéder à vos données KnowDesk depuis vos applications."
      createCta={{ label: 'Créer une clé', onClick: () => setShowCreate(true) }}
      loading={loading}
      items={keys}
      emptyMessage="Aucune clé API. Créez-en une pour intégrer KnowDesk à vos outils."
      listClassName="api-keys-list"
      beforeList={newKey ? (
        <div className="api-key-reveal">
          <div className="api-key-reveal__header">
            <span className="api-key-reveal__title icon-label"><TriangleAlert size={20} />Copiez cette clé maintenant</span>
            <button type="button" className="api-key-reveal__dismiss" onClick={() => setNewKey(null)}><X size={16} /></button>
          </div>
          <p className="api-key-reveal__desc">
            Cette clé ne sera plus affichée après la fermeture de cette fenêtre.
          </p>
          <div className="api-key-reveal__key">
            <code className="api-key-reveal__code">{newKey}</code>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              {copied ? <><Check size={16} />Copié</> : 'Copier'}
            </Button>
          </div>
        </div>
      ) : null}
      renderItem={key => (
        <li key={key.id} className="api-key-item">
          <span className="api-key-item__name">{key.name}</span>
          <code className="api-key-item__prefix">{key.key_prefix}••••••••</code>
          <span className="api-key-item__meta">
            Créée {formatRelative(key.created_at)}
            {key.last_used_at && ` · Utilisée ${formatRelative(key.last_used_at)}`}
          </span>
          <Button
            variant="ghost" size="sm"
            onClick={() => setConfirmRevoke({ id: key.id, name: key.name })}
          >
            Révoquer
          </Button>
        </li>
      )}
    >
      {confirmRevoke && (
        <ConfirmDialog
          title={`Révoquer « ${confirmRevoke.name} » ?`}
          description="Cette clé sera immédiatement invalidée et les intégrations qui l'utilisent cesseront de fonctionner. Cette action est irréversible."
          confirmLabel="Révoquer la clé"
          variant="danger"
          onConfirm={() => { revokeKey(confirmRevoke.id); setConfirmRevoke(null); }}
          onCancel={() => setConfirmRevoke(null)}
        />
      )}
      {showCreate && (
        <Modal
          title="Nouvelle clé API"
          onClose={() => setShowCreate(false)}
          asForm
          onSubmit={handleCreate}
          footer={
            <>
              <Button type="button" variant="ghost" size="md" onClick={() => setShowCreate(false)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" size="md" loading={creating} disabled={!name.trim()}>
                Créer la clé
              </Button>
            </>
          }
        >
          <Input
            id="key-name"
            type="text"
            label="Nom de la clé"
            placeholder="Par exemple : Intégration Hubicus"
            helperText="Un nom qui permet de reconnaître l'usage de cette clé."
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </Modal>
      )}
    </SettingsListSection>
  );
}
