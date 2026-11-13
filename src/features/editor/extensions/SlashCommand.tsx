import React, { useEffect, useImperativeHandle, useState, forwardRef, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Extension } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import type { Editor, Range } from '@tiptap/core';
import { CALLOUT_TYPES } from './Callout';
import { List, ListTodo, Minus, Quote, Table as TableIcon } from 'lucide-react';
import { StatusIcon } from '../../../shared/components/ui/StatusIcon';

export interface SlashCommandItem {
  id:          string;
  label:       string;
  description: string;
  /** Picto Lucide, ou libellé typographique (H2, 1., { }). */
  icon:        React.ReactNode;
  command:     (args: { editor: Editor; range: Range }) => void;
  /** Mots-clés pour le filtrage (en plus du label) */
  keywords?:   string[];
}

const ITEMS: SlashCommandItem[] = [
  {
    id: 'h2', label: 'Titre 2', description: 'Sous-titre principal',
    icon: 'H2', keywords: ['heading', 'h2', 'titre'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3', label: 'Titre 3', description: 'Sous-titre secondaire',
    icon: 'H3', keywords: ['heading', 'h3', 'titre'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'bullet', label: 'Liste à puces', description: 'Liste non ordonnée',
    icon: <List size={16} />, keywords: ['list', 'bullet', 'liste', 'puces'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: 'ordered', label: 'Liste numérotée', description: 'Liste ordonnée',
    icon: '1.', keywords: ['list', 'ordered', 'liste', 'numero'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: 'tasks', label: 'Liste de tâches', description: 'Cases à cocher',
    icon: <ListTodo size={16} />, keywords: ['task', 'todo', 'tache', 'checkbox'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    id: 'quote', label: 'Citation', description: 'Bloc de citation',
    icon: <Quote size={16} />, keywords: ['quote', 'citation', 'blockquote'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    id: 'code', label: 'Bloc de code', description: 'Code avec coloration syntaxique',
    icon: '{ }', keywords: ['code', 'pre', 'syntax'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    id: 'table', label: 'Tableau', description: 'Tableau 3 × 3 avec en-têtes',
    icon: <TableIcon size={16} />, keywords: ['table', 'tableau', 'grid'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range)
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'hr', label: 'Séparateur horizontal', description: 'Ligne de séparation',
    icon: <Minus size={16} />, keywords: ['hr', 'rule', 'separator', 'separateur'],
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  ...CALLOUT_TYPES.map(type => {
    const meta: Record<string, { label: string }> = {
      info:    { label: 'Encadré information' },
      success: { label: 'Encadré succès' },
      warning: { label: 'Encadré attention' },
      danger:  { label: 'Encadré danger' },
    };
    return {
      id: `callout-${type}`,
      label: meta[type].label,
      description: 'Bloc coloré pour mettre en avant une info',
      icon: <StatusIcon tone={type} size={16} />,
      keywords: ['callout', 'note', type],
      command: ({ editor, range }: { editor: Editor; range: Range }) =>
        editor.chain().focus().deleteRange(range).toggleCallout(type).run(),
    } as SlashCommandItem;
  }),
];

function filterItems(query: string): SlashCommandItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return ITEMS;
  return ITEMS.filter(it =>
    it.label.toLowerCase().includes(q) ||
    (it.keywords?.some(k => k.toLowerCase().includes(q)) ?? false),
  );
}

// ─── Popup React component ─────────────────────────────────────

interface SlashMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SlashMenuProps {
  items:   SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => { setSelectedIndex(0); }, [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex(i => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex(i => (i + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        const item = items[selectedIndex];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }), [items, selectedIndex, command]);

  if (items.length === 0) {
    return <div className="slash-menu slash-menu--empty">Aucune commande</div>;
  }

  return (
    <div className="slash-menu" role="menu">
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          className={`slash-menu__item ${i === selectedIndex ? 'slash-menu__item--active' : ''}`}
          onClick={() => command(item)}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <span className="slash-menu__icon" aria-hidden="true">{item.icon}</span>
          <span className="slash-menu__main">
            <span className="slash-menu__label">{item.label}</span>
            <span className="slash-menu__desc">{item.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
});
SlashMenu.displayName = 'SlashMenu';

// ─── Popup React (createRoot directement, sans ReactRenderer) ─────

/**
 * Container DOM portal qui rend le SlashMenu React et expose un ref pour
 * que onKeyDown du Suggestion puisse forwarder les flèches/Enter.
 */
class SlashPopup {
  private el: HTMLDivElement | null = null;
  private root: Root | null = null;
  private menuRef: React.RefObject<SlashMenuRef | null> = { current: null };

  mount(items: SlashCommandItem[], commandFn: (it: SlashCommandItem) => void, rect: DOMRect): void {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'slash-menu-portal';
      document.body.appendChild(this.el);
      this.root = createRoot(this.el);
    }
    const top = window.scrollY + rect.bottom + 6;
    const left = window.scrollX + rect.left;
    this.el.style.position = 'absolute';
    this.el.style.top  = `${top}px`;
    this.el.style.left = `${left}px`;
    this.el.style.zIndex = '1000';
    this.root!.render(<SlashMenu ref={this.menuRef} items={items} command={commandFn} />);
  }

  onKeyDown(event: KeyboardEvent): boolean {
    return this.menuRef.current?.onKeyDown({ event }) ?? false;
  }

  destroy(): void {
    if (this.root) { this.root.unmount(); this.root = null; }
    if (this.el?.parentNode) { this.el.parentNode.removeChild(this.el); this.el = null; }
  }
}

// ─── TipTap extension ──────────────────────────────────────────

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashCommandItem }) => {
          props.command({ editor, range });
        },
      } as Partial<SuggestionOptions<SlashCommandItem, SlashCommandItem>>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem, SlashCommandItem>({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }) => filterItems(query),
        render: () => {
          let popup: SlashPopup | null = null;

          return {
            onStart: (props) => {
              const rect = props.clientRect?.();
              if (!rect) return;
              popup = new SlashPopup();
              popup.mount(props.items, (it) => props.command(it), rect);
            },
            onUpdate: (props) => {
              if (!popup) return;
              const rect = props.clientRect?.();
              if (rect) popup.mount(props.items, (it) => props.command(it), rect);
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                popup?.destroy();
                popup = null;
                return true;
              }
              return popup?.onKeyDown(props.event) ?? false;
            },
            onExit: () => {
              popup?.destroy();
              popup = null;
            },
          };
        },
      }),
    ];
  },
});
