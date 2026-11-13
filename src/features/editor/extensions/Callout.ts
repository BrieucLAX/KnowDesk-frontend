import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutType = 'info' | 'success' | 'warning' | 'danger';

export const CALLOUT_TYPES: CalloutType[] = ['info', 'success', 'warning', 'danger'];

/**
 * Custom block node "callout" — encadré coloré contenant du texte enrichi.
 *
 * 4 variantes : info (bleu) / success (vert) / warning (ambré) / danger (rouge).
 * Sérialise en `<div data-type="callout" data-callout="info">…</div>` —
 * compatible avec la sanitize backend (data-type + data-callout whitelisted).
 *
 * Usage TipTap :
 *   editor.chain().focus().setCallout('info').run()
 *   editor.chain().focus().toggleCallout('warning').run()
 */
export const Callout = Node.create<{
  HTMLAttributes: Record<string, unknown>;
}>({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      type: {
        default: 'info' as CalloutType,
        parseHTML: el => el.getAttribute('data-callout') ?? 'info',
        renderHTML: attrs => ({ 'data-callout': attrs.type as string }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="callout"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        { 'data-type': 'callout', class: 'callout' },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout: (type: CalloutType) => ({ commands }) => {
        return commands.wrapIn(this.name, { type });
      },
      toggleCallout: (type: CalloutType) => ({ commands }) => {
        return commands.toggleWrap(this.name, { type });
      },
      unsetCallout: () => ({ commands }) => {
        return commands.lift(this.name);
      },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout:    (type: CalloutType) => ReturnType;
      toggleCallout: (type: CalloutType) => ReturnType;
      unsetCallout:  () => ReturnType;
    };
  }
}
