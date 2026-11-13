import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { StarterKit }       from '@tiptap/starter-kit';
import { Link }             from '@tiptap/extension-link';
import { Image }            from '@tiptap/extension-image';
import { Placeholder }      from '@tiptap/extension-placeholder';
import { CharacterCount }   from '@tiptap/extension-character-count';
import { Table }            from '@tiptap/extension-table';
import { TableRow }         from '@tiptap/extension-table-row';
import { TableCell }        from '@tiptap/extension-table-cell';
import { TableHeader }      from '@tiptap/extension-table-header';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { TaskList }         from '@tiptap/extension-task-list';
import { TaskItem }         from '@tiptap/extension-task-item';
import { Underline }        from '@tiptap/extension-underline';
import { Highlight }        from '@tiptap/extension-highlight';
import { Typography }       from '@tiptap/extension-typography';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import bash       from 'highlight.js/lib/languages/bash';
import json       from 'highlight.js/lib/languages/json';
import sql        from 'highlight.js/lib/languages/sql';
import xml        from 'highlight.js/lib/languages/xml';
import css        from 'highlight.js/lib/languages/css';
import python     from 'highlight.js/lib/languages/python';
import { Callout, CALLOUT_TYPES, type CalloutType } from '../extensions/Callout';
import { SlashCommand }      from '../extensions/SlashCommand';
import { LinkModal }         from './LinkModal';
import './RichTextEditor.css';

// Curation de langages — ~8 langs au lieu des 192 de common (gain ~400 KB).
// Si un client a besoin d'autres langues, ajouter ici.
const lowlight = createLowlight();
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('bash',       bash);
lowlight.register('shell',      bash);
lowlight.register('json',       json);
lowlight.register('sql',        sql);
lowlight.register('html',       xml);
lowlight.register('xml',        xml);
lowlight.register('css',        css);
lowlight.register('python',     python);

interface RichTextEditorProps {
  value:          string;
  onChange:       (html: string) => void;
  placeholder?:   string;
  readOnly?:      boolean;
  labelledBy?:    string;
  onViewArticle?: (articleId: string) => void;
  articleId?:     string;
  onBeforeImageUpload?: () => Promise<string | null>;
  /**
   * Override l'endpoint d'upload d'image. Si fourni, prend le pas sur
   * `articleId`/`onBeforeImageUpload`. Path relatif sans le `/api/v1`,
   * exemple : `/trees/abc-123/images`. Permet de réutiliser cet éditeur
   * pour d'autres ressources que les articles.
   */
  imageUploadPath?: string;
}

/**
 * Éditeur d'article — TipTap (ProseMirror).
 *
 * Sortie HTML pour rester compatible avec les articles existants (seedés ou
 * écrits avec l'ancien éditeur execCommand). Le sanitize backend autorise
 * les nouveaux attributs (data-type, data-callout, data-checked, etc.) — cf
 * shared/lib/sanitize.ts.
 *
 * Features :
 *  - Toolbar : bold, italic, underline, strike, H2, H3, listes (bullet / ordered / task),
 *    blockquote, code inline, code block coloré, table, hr, link, image, callout, highlight
 *  - Bubble menu sur sélection (formatage rapide)
 *  - Markdown shortcuts (`# `, `## `, `> `, ` - `, etc. via Typography + StarterKit)
 *  - Character count
 */
export function RichTextEditor({
  value, onChange, placeholder, readOnly, labelledBy, onViewArticle,
  articleId, onBeforeImageUpload, imageUploadPath,
}: RichTextEditorProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  // Drapeau pour ne pas pousser onChange en boucle quand le parent updatera value.
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // remplacé par CodeBlockLowlight
        link:      false, // configuré séparément avec target/rel
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({
        inline: false,
        HTMLAttributes: { class: 'article-img' },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') return 'Titre…';
          return placeholder ?? 'Commencez à rédiger… ou tapez « / » pour insérer un bloc.';
        },
      }),
      CharacterCount.configure({}),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'article-table' },
      }),
      TableRow,
      TableHeader,
      TableCell,
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      Callout,
      SlashCommand,
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      onChange(editor.getHTML());
      // Reset après le rendu — nécessaire pour que useEffect ne ré-injecte pas
      // le HTML qu'on vient juste d'émettre (boucle visible : curseur qui saute).
      queueMicrotask(() => { isInternalUpdate.current = false; });
    },
    editorProps: {
      attributes: {
        class: 'rte__content article-content',
        ...(labelledBy ? { 'aria-labelledby': labelledBy } : {}),
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
    immediatelyRender: false,
  });

  // Synchronisation externe → éditeur quand `value` change côté parent
  // (chargement initial, restauration version, switch d'article).
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) return;
    if (editor.getHTML() === value) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  // Click sur un lien interne en mode lecture → callback (déjà fait par l'app).
  useEffect(() => {
    if (!editor || !readOnly || !onViewArticle) return;
    const dom = editor.view.dom as HTMLElement;
    const handler = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[data-article-id]') as HTMLAnchorElement | null;
      if (link) {
        e.preventDefault();
        const aid = link.getAttribute('data-article-id');
        if (aid) onViewArticle(aid);
      }
    };
    dom.addEventListener('click', handler);
    return () => dom.removeEventListener('click', handler);
  }, [editor, readOnly, onViewArticle]);

  // Click sur l'icône image dans la toolbar → upload R2.
  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;

    // Détermine l'URL d'upload : `imageUploadPath` override (cas trees,
    // potentiellement d'autres ressources à l'avenir), sinon flow article
    // historique (articleId direct, ou onBeforeImageUpload → article id).
    let uploadPath: string | null = null;
    if (imageUploadPath) {
      uploadPath = imageUploadPath;
    } else {
      let id = articleId;
      if (!id && onBeforeImageUpload) {
        id = (await onBeforeImageUpload()) ?? undefined;
      }
      if (id) uploadPath = `/articles/${id}/images`;
    }
    if (!uploadPath) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const apiBase = import.meta.env.VITE_API_URL ?? '/api/v1';
      const res  = await fetch(`${apiBase}${uploadPath}`, {
        method:      'POST',
        credentials: 'include',
        body:        formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? 'Erreur upload');
      editor.chain().focus().setImage({ src: data.data.public_url, alt: data.data.filename }).run();
    } catch (err) {
      console.warn('[editor] image upload failed', err);
    }
  }, [editor, articleId, onBeforeImageUpload, imageUploadPath]);

  const handleImageClick = useCallback(() => {
    const input    = document.createElement('input');
    input.type     = 'file';
    input.accept   = 'image/jpeg,image/png,image/gif,image/webp';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) void handleImageUpload(file);
    };
    input.click();
  }, [handleImageUpload]);

  const handleInsertLink = useCallback((url: string, text: string, isInternal: boolean, artId?: string) => {
    if (!editor) return;
    setShowLinkModal(false);

    const sel = editor.view.state.selection;
    const hasSelection = !sel.empty;

    const attrs: { href: string; target?: string; rel?: string; class?: string; 'data-article-id'?: string } = {
      href: url,
      class: isInternal ? 'article-link--internal' : 'article-link--external',
    };
    if (!isInternal) {
      attrs.target = '_blank';
      attrs.rel    = 'noopener noreferrer';
    } else if (artId) {
      attrs['data-article-id'] = artId;
    }

    if (hasSelection) {
      editor.chain().focus().setLink(attrs).run();
    } else {
      editor.chain().focus()
        .insertContent({
          type: 'text',
          marks: [{ type: 'link', attrs }],
          text: text || url,
        })
        .run();
    }
  }, [editor]);

  if (!editor) return <div className="rte rte--loading" />;

  return (
    <>
      <div className="rte">
        {!readOnly && (
          <Toolbar
            editor={editor}
            onLinkClick={() => setShowLinkModal(true)}
            onImageClick={handleImageClick}
            hasImage={!!articleId || !!onBeforeImageUpload || !!imageUploadPath}
          />
        )}
        {!readOnly && (
          <BubbleMenu editor={editor} options={{ placement: 'top' }}>
            <BubbleMenuToolbar editor={editor} onLinkClick={() => setShowLinkModal(true)} />
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
        {!readOnly && (
          <div className="rte__footer" aria-live="polite">
            {editor.storage.characterCount.characters()} caractères · {editor.storage.characterCount.words()} mots
          </div>
        )}
      </div>

      {showLinkModal && (
        <LinkModal
          onInsert={handleInsertLink}
          onClose={() => setShowLinkModal(false)}
          selectedText={editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)}
        />
      )}
    </>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────

function Toolbar({ editor, onLinkClick, onImageClick, hasImage }: {
  editor: Editor;
  onLinkClick: () => void;
  onImageClick: () => void;
  hasImage: boolean;
}) {
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);

  return (
    <div className="rte__toolbar" role="toolbar" aria-label="Outils de mise en forme">
      <ToolGroup>
        <ToolBtn label="Gras (⌘B)"        active={editor.isActive('bold')}        onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></ToolBtn>
        <ToolBtn label="Italique (⌘I)"    active={editor.isActive('italic')}      onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolBtn>
        <ToolBtn label="Souligné (⌘U)"    active={editor.isActive('underline')}   onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolBtn>
        <ToolBtn label="Barré"            active={editor.isActive('strike')}      onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></ToolBtn>
        <ToolBtn label="Code inline"      active={editor.isActive('code')}        onClick={() => editor.chain().focus().toggleCode().run()}>{'<>'}</ToolBtn>
      </ToolGroup>

      <ToolGroup>
        <ToolBtn label="Titre 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolBtn>
        <ToolBtn label="Titre 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolBtn>
      </ToolGroup>

      <ToolGroup>
        <ToolBtn label="Liste à puces"   active={editor.isActive('bulletList')}  onClick={() => editor.chain().focus().toggleBulletList().run()}>≡</ToolBtn>
        <ToolBtn label="Liste numérotée" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</ToolBtn>
        <ToolBtn label="Tâches"          active={editor.isActive('taskList')}    onClick={() => editor.chain().focus().toggleTaskList().run()}>☐</ToolBtn>
      </ToolGroup>

      <ToolGroup>
        <ToolBtn label="Citation"   active={editor.isActive('blockquote')}  onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</ToolBtn>
        <ToolBtn label="Bloc code"  active={editor.isActive('codeBlock')}   onClick={() => editor.chain().focus().toggleCodeBlock().run()}>{'{ }'}</ToolBtn>
        <div className="rte__dropdown" onMouseLeave={() => setShowCalloutMenu(false)}>
          <ToolBtn label="Encadré coloré" active={editor.isActive('callout')} onClick={() => setShowCalloutMenu(s => !s)}>⚐</ToolBtn>
          {showCalloutMenu && (
            <div className="rte__menu" role="menu">
              {CALLOUT_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  className={`rte__menu-item rte__menu-item--callout-${t}`}
                  onClick={() => { editor.chain().focus().toggleCallout(t).run(); setShowCalloutMenu(false); }}
                  role="menuitem"
                >
                  {calloutLabel(t)}
                </button>
              ))}
            </div>
          )}
        </div>
        <ToolBtn label="Ligne horizontale" onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</ToolBtn>
      </ToolGroup>

      <ToolGroup>
        <div className="rte__dropdown" onMouseLeave={() => setShowHighlightMenu(false)}>
          <ToolBtn label="Surligner" active={editor.isActive('highlight')} onClick={() => setShowHighlightMenu(s => !s)}>✏︎</ToolBtn>
          {showHighlightMenu && (
            <div className="rte__menu rte__menu--colors" role="menu">
              {HIGHLIGHT_COLORS.map(c => (
                <button
                  key={c.color}
                  type="button"
                  className="rte__color-swatch"
                  style={{ background: c.color }}
                  title={c.label}
                  onClick={() => { editor.chain().focus().setHighlight({ color: c.color }).run(); setShowHighlightMenu(false); }}
                  role="menuitem"
                />
              ))}
              <button
                type="button"
                className="rte__menu-item rte__menu-item--unset"
                onClick={() => { editor.chain().focus().unsetHighlight().run(); setShowHighlightMenu(false); }}
                role="menuitem"
              >
                Aucun
              </button>
            </div>
          )}
        </div>
        <ToolBtn label="Tableau" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>▦</ToolBtn>
        <ToolBtn label="Lien (⌘K)" active={editor.isActive('link')} onClick={onLinkClick}>🔗</ToolBtn>
        {hasImage && <ToolBtn label="Image" onClick={onImageClick}>🖼</ToolBtn>}
      </ToolGroup>

      <ToolGroup>
        <ToolBtn label="Effacer le formatage" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>Tx</ToolBtn>
      </ToolGroup>
    </div>
  );
}

function BubbleMenuToolbar({ editor, onLinkClick }: { editor: Editor; onLinkClick: () => void }) {
  return (
    <div className="rte__bubble" role="toolbar" aria-label="Mise en forme rapide">
      <ToolBtn label="Gras"      active={editor.isActive('bold')}      onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></ToolBtn>
      <ToolBtn label="Italique"  active={editor.isActive('italic')}    onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolBtn>
      <ToolBtn label="Souligné"  active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolBtn>
      <ToolBtn label="Code"      active={editor.isActive('code')}      onClick={() => editor.chain().focus().toggleCode().run()}>{'<>'}</ToolBtn>
      <ToolBtn label="Surligner" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight({ color: HIGHLIGHT_COLORS[0].color }).run()}>✏︎</ToolBtn>
      <ToolBtn label="Lien"      active={editor.isActive('link')}      onClick={onLinkClick}>🔗</ToolBtn>
    </div>
  );
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="rte__group">{children}</div>;
}

function ToolBtn({
  children, onClick, label, active,
}: {
  children: React.ReactNode;
  onClick:  () => void;
  label:    string;
  active?:  boolean;
}) {
  return (
    <button
      type="button"
      className={`rte__tool ${active ? 'rte__tool--active' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

// Couleurs de surlignage : elles sont écrites dans le HTML de l'article
// (style en ligne) et relues hors de l'app (chatbot, extension), où les
// variables du design system n'existent pas. Gardées volontairement en dur.
const HIGHLIGHT_COLORS = [
  { color: '#fef3c7', label: 'Jaune'  },
  { color: '#dcfce7', label: 'Vert'   },
  { color: '#dbeafe', label: 'Bleu'   },
  { color: '#fee2e2', label: 'Rouge'  },
  { color: '#fed7aa', label: 'Orange' },
  { color: '#e9d5ff', label: 'Violet' },
];

function calloutLabel(t: CalloutType): string {
  const labels: Record<CalloutType, string> = {
    info:    'ℹ️ Information',
    success: '✅ Succès',
    warning: '⚠️ Attention',
    danger:  '⛔ Danger',
  };
  return labels[t];
}
