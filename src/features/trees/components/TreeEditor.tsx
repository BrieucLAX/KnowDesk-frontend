import React, { useState, useCallback } from 'react';
import { useTreeEditor }  from '../hooks/useTreeEditor';
import '../trees.css';
import { Button }         from '../../../shared/components/ui/Button';
import { Skeleton }       from '../../../shared/components/ui/Skeleton';
import { ConfirmDialog }  from '../../../shared/components/ui/ConfirmDialog';
import { useToast }       from '../../../shared/lib/useToast';
import { sanitizeArticleHtml } from '../../../shared/lib/sanitize';
import { RichTextEditor }  from '../../editor/components/RichTextEditor';
import type { TreeNode, NodeAnswer } from '../types';
import { ArrowLeft, ArrowRight, CircleCheck, CircleHelp, Pencil, Plus, Trash2, X } from 'lucide-react';

interface TreeEditorProps {
  treeId:   string;
  onBack:   () => void;
  onPreview: (treeId: string) => void;
}

export function TreeEditor({ treeId, onBack, onPreview }: TreeEditorProps) {
  const toast = useToast();
  const {
    tree, loading,
    updateTree, publishTree,
    addNode, updateNode, deleteNode,
    addAnswer, updateAnswer, deleteAnswer,
  } = useTreeEditor(treeId);

  const [editingTitle,   setEditingTitle]   = useState(false);
  const [titleDraft,     setTitleDraft]     = useState('');
  const [addingNode,     setAddingNode]     = useState<{
    parentId: string | null; parentAnswerId: string | null;
  } | null>(null);
  const [nodeDraft,      setNodeDraft]      = useState('');
  const [nodeType,       setNodeType]       = useState<'question' | 'conclusion'>('question');
  const [editingNode,    setEditingNode]    = useState<string | null>(null);
  const [nodeEditDraft,  setNodeEditDraft]  = useState('');
  const [addingAnswer,      setAddingAnswer]      = useState<string | null>(null);
  const [answerDraft,       setAnswerDraft]       = useState('');
  const [publishing,        setPublishing]        = useState(false);
  const [confirmDeleteNode, setConfirmDeleteNode] = useState<string | null>(null);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      await publishTree();
      toast.success('Processus publié.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publication impossible. Réessayez dans un instant.');
    } finally {
      setPublishing(false);
    }
  }, [publishTree, toast]);

  const handleSaveTitle = useCallback(async () => {
    if (!titleDraft.trim()) return;
    await updateTree({ title: titleDraft.trim() });
    setEditingTitle(false);
    toast.success('Titre mis à jour.');
  }, [titleDraft, updateTree, toast]);

  const handleAddNode = useCallback(async () => {
    if (!nodeDraft.trim() || !addingNode) return;
    await addNode({
      type:           nodeType,
      content:        nodeDraft.trim(),
      parentId:       addingNode.parentId,
      parentAnswerId: addingNode.parentAnswerId,
      position:       0,
    });
    setNodeDraft('');
    setAddingNode(null);
    toast.success('Étape ajoutée.');
  }, [nodeDraft, nodeType, addingNode, addNode, toast]);

  const handleUpdateNode = useCallback(async (nodeId: string) => {
    if (!nodeEditDraft.trim()) return;
    await updateNode(nodeId, { content: nodeEditDraft.trim() });
    setEditingNode(null);
    toast.success('Étape modifiée.');
  }, [nodeEditDraft, updateNode, toast]);

  const handleDeleteNode = useCallback(async (nodeId: string) => {
    setConfirmDeleteNode(nodeId);
  }, []);

  const confirmDeleteNodeAction = useCallback(async () => {
    if (!confirmDeleteNode) return;
    await deleteNode(confirmDeleteNode);
    setConfirmDeleteNode(null);
    toast.success('Étape supprimée.');
  }, [confirmDeleteNode, deleteNode, toast]);

  const handleAddAnswer = useCallback(async (nodeId: string) => {
    if (!answerDraft.trim()) return;
    await addAnswer(nodeId, { label: answerDraft.trim() });
    setAnswerDraft('');
    setAddingAnswer(null);
    toast.success('Réponse ajoutée.');
  }, [answerDraft, addAnswer, toast]);

  const handleDeleteAnswer = useCallback(async (nodeId: string, answerId: string) => {
    await deleteAnswer(nodeId, answerId);
    toast.success('Réponse supprimée.');
  }, [deleteAnswer, toast]);

  if (loading) return (
    <div className="tree-editor">
      <Skeleton className="sk-title" />
      <Skeleton className="sk-p" />
    </div>
  );

  if (!tree) return (
    <div className="tree-editor tree-editor--error">
      <p>Processus introuvable.</p>
      <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={16} />}>Retour</Button>
    </div>
  );

  // Nœuds racines (sans parent)
  const rootNodes = tree.nodes.filter(n => n.parent_id === null);

  const renderNode = (node: TreeNode, depth = 0): React.ReactNode => {
    const childrenByAnswer = node.answers.map(answer => ({
      answer,
      children: tree.nodes.filter(n => n.parent_answer_id === answer.id),
    }));

    return (
      <div key={node.id} className={`tree-node tree-node--${node.type}`} style={{ '--tree-depth': depth } as React.CSSProperties}>
        <div className="tree-node__header">
          <span className={`tree-node__badge tree-node__badge--${node.type}`}>
            {node.type === 'question'
              ? <><CircleHelp size={16} />Question</>
              : <><CircleCheck size={16} />Conclusion</>}
          </span>
          <div className="tree-node__actions">
            <button
              type="button"
              className="tree-node__action"
              onClick={() => { setEditingNode(node.id); setNodeEditDraft(node.content); }}
              title="Modifier l'étape"
              aria-label="Modifier l'étape"
            ><Pencil size={16} /></button>
            <button
              type="button"
              className="tree-node__action tree-node__action--danger"
              onClick={() => handleDeleteNode(node.id)}
              title="Supprimer l'étape"
              aria-label="Supprimer l'étape"
            ><Trash2 size={16} /></button>
          </div>
        </div>

        {editingNode === node.id ? (
          <div className="tree-node__edit">
            {node.type === 'conclusion' ? (
              <RichTextEditor
                value={nodeEditDraft}
                onChange={setNodeEditDraft}
                placeholder="Saisir la conclusion…"
                imageUploadPath={`/trees/${treeId}/images`}
              />
            ) : (
              <textarea
                className="tree-node__textarea"
                value={nodeEditDraft}
                onChange={e => setNodeEditDraft(e.target.value)}
                rows={3}
                autoFocus
              />
            )}
            <div className="tree-node__edit-actions">
              <Button variant="primary" size="sm" onClick={() => handleUpdateNode(node.id)}>Enregistrer</Button>
              <Button variant="ghost"   size="sm" onClick={() => setEditingNode(null)}>Annuler</Button>
            </div>
          </div>
        ) : (
          <div
            className="tree-node__content article-content"
            dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(node.content) }}
          />
        )}

        {node.type === 'question' && (
          <div className="tree-node__answers">
            {node.answers.map(answer => (
              <div key={answer.id} className="tree-answer">
                <div className="tree-answer__header">
                  <span className="tree-answer__label icon-label"><ArrowRight size={16} />{answer.label}</span>
                  <button
                    type="button"
                    className="tree-answer__delete"
                    onClick={() => handleDeleteAnswer(node.id, answer.id)}
                    title="Supprimer cette réponse"
                  ><X size={16} /></button>
                </div>
                {/* Nœuds enfants de cette réponse */}
                {tree.nodes
                  .filter(n => n.parent_answer_id === answer.id)
                  .map(child => renderNode(child, depth + 1))
                }
                {/* Bouton pour ajouter un nœud sous cette réponse */}
                {addingNode?.parentAnswerId === answer.id ? (
                  <div className="tree-add-node" style={{ '--tree-depth': depth + 1 } as React.CSSProperties}>
                    <select
                      className="field-input tree-add-node__type"
                      value={nodeType}
                      onChange={e => setNodeType(e.target.value as 'question' | 'conclusion')}
                    >
                      <option value="question">Question</option>
                      <option value="conclusion">Conclusion</option>
                    </select>
                    {nodeType === 'conclusion' ? (
                      <RichTextEditor
                        value={nodeDraft}
                        onChange={setNodeDraft}
                        placeholder="Saisir la conclusion…"
                        imageUploadPath={`/trees/${treeId}/images`}
                      />
                    ) : (
                      <textarea
                        className="tree-node__textarea"
                        placeholder="Saisir la question…"
                        value={nodeDraft}
                        onChange={e => setNodeDraft(e.target.value)}
                        rows={2}
                        autoFocus
                      />
                    )}
                    <div className="tree-node__edit-actions">
                      <Button variant="primary" size="sm" onClick={handleAddNode}>Ajouter l'étape</Button>
                      <Button variant="ghost"   size="sm" onClick={() => setAddingNode(null)}>Annuler</Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="tree-add-child"
                    style={{ '--tree-depth': depth + 1 } as React.CSSProperties}
                    onClick={() => setAddingNode({ parentId: node.id, parentAnswerId: answer.id })}
                  >
                    <Plus size={20} />Ajouter une étape
                  </button>
                )}
              </div>
            ))}

            {/* Bouton pour ajouter une réponse */}
            {addingAnswer === node.id ? (
              <div className="tree-add-answer">
                <input
                  type="text"
                  className="field-input"
                  placeholder="Libellé de la réponse…"
                  value={answerDraft}
                  onChange={e => setAnswerDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddAnswer(node.id); }}
                  autoFocus
                />
                <div className="tree-node__edit-actions">
                  <Button variant="primary" size="sm" onClick={() => handleAddAnswer(node.id)}>Ajouter la réponse</Button>
                  <Button variant="ghost"   size="sm" onClick={() => setAddingAnswer(null)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="tree-add-answer-btn"
                onClick={() => setAddingAnswer(node.id)}
              >
                <Plus size={20} />Ajouter une réponse
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
    {confirmDeleteNode && (
      <ConfirmDialog
        title="Supprimer cette étape ?"
        description="L'étape et tout ce qui en découle (réponses et questions suivantes) seront supprimés. Cette action est définitive."
        confirmLabel="Supprimer l'étape"
        variant="danger"
        onConfirm={confirmDeleteNodeAction}
        onCancel={() => setConfirmDeleteNode(null)}
      />
    )}
    <div className="tree-editor">
      {/* Topbar */}
      <div className="tree-editor__topbar">
        <button type="button" className="tree-editor__back icon-label" onClick={onBack}><ArrowLeft size={16} />Retour</button>
        <div className="tree-editor__topbar-center">
          {editingTitle ? (
            <div className="tree-editor__title-edit">
              <input
                type="text"
                className="tree-editor__title-input"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                autoFocus
              />
              <Button variant="primary" size="sm" onClick={handleSaveTitle}>Enregistrer le titre</Button>
              <Button variant="ghost"   size="sm" onClick={() => setEditingTitle(false)}>Annuler</Button>
            </div>
          ) : (
            <button
              type="button"
              className="tree-editor__title"
              onClick={() => { setTitleDraft(tree.title); setEditingTitle(true); }}
              title="Cliquez pour modifier le titre"
            >
              {tree.title} <Pencil size={16} className="icon-inline" />
            </button>
          )}
        </div>
        <div className="tree-editor__topbar-actions">
          <select
            className="field-input"
            value={tree.visibility}
            onChange={e => updateTree({ visibility: e.target.value as 'internal' | 'public' })}
            title="Visibilité du processus"
            style={{ maxWidth: 220 }}
          >
            <option value="internal">Interne</option>
            <option value="public">Public (chatbot)</option>
          </select>
          <Button variant="ghost"   size="sm" onClick={() => onPreview(treeId)}>Voir l'aperçu conseiller</Button>
          <Button
            variant="primary" size="sm"
            loading={publishing}
            onClick={handlePublish}
            disabled={tree.status === 'published'}
          >
            {tree.status === 'published' ? 'Publié' : 'Publier le processus'}
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="tree-editor__canvas">
        {rootNodes.length === 0 && (
          <div className="tree-editor__empty">
            <p>Aucune étape pour l'instant.</p>
            <p>Ajoutez un premier point d'entrée ci-dessous.</p>
          </div>
        )}

        {/* Nœuds racines */}
        <div className="tree-roots">
          {rootNodes.map(node => renderNode(node))}
        </div>

        {/* Bouton pour ajouter un nœud racine */}
        {addingNode?.parentId === null && addingNode?.parentAnswerId === null ? (
          <div className="tree-add-node tree-add-node--root">
            <select
              className="field-input tree-add-node__type"
              value={nodeType}
              onChange={e => setNodeType(e.target.value as 'question' | 'conclusion')}
            >
              <option value="question">Question</option>
              <option value="conclusion">Conclusion</option>
            </select>
            {nodeType === 'conclusion' ? (
              <RichTextEditor
                value={nodeDraft}
                onChange={setNodeDraft}
                placeholder="Saisir la conclusion…"
                imageUploadPath={`/trees/${treeId}/images`}
              />
            ) : (
              <textarea
                className="tree-node__textarea"
                placeholder="Saisir la question…"
                value={nodeDraft}
                onChange={e => setNodeDraft(e.target.value)}
                rows={3}
                autoFocus
              />
            )}
            <div className="tree-node__edit-actions">
              <Button variant="primary" size="sm" onClick={handleAddNode}>Ajouter l'étape</Button>
              <Button variant="ghost"   size="sm" onClick={() => setAddingNode(null)}>Annuler</Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="tree-add-root"
            onClick={() => setAddingNode({ parentId: null, parentAnswerId: null })}
          >
            <Plus size={20} />Ajouter un point d'entrée
          </button>
        )}
      </div>
    </div>
    </>
  );
}
