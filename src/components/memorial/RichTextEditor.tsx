import React, { useEffect, useRef } from 'react';
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sanitizeRichText } from '@/lib/memorial';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}

const RichTextEditor = ({ value, onChange, placeholder, ariaLabel = 'Biografija' }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = sanitizeRichText(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rememberSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const el = ref.current;
    if (!el) return;
    // execCommand za liste/blockquote ne radi na potpuno praznom editoru
    if (!el.textContent?.trim() && !el.querySelector('p, div, li, br')) {
      el.innerHTML = '<p><br></p>';
    }
    el.focus();
    const sel = window.getSelection();
    if (!sel) return;
    if (savedRange.current && el.contains(savedRange.current.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
      return;
    }
    if (!sel.rangeCount || !el.contains(sel.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const exec = (command: string, arg?: string) => {
    restoreSelection();
    try { document.execCommand('styleWithCSS', false, 'false'); } catch { /* ignore */ }
    document.execCommand(command, false, arg);
    rememberSelection();
    if (ref.current) onChange(sanitizeRichText(ref.current.innerHTML));
  };


  const tools: Array<{ icon: React.ElementType; label: string; action: () => void }> = [
    { icon: Bold, label: 'Podebljano', action: () => exec('bold') },
    { icon: Italic, label: 'Kurziv', action: () => exec('italic') },
    { icon: Heading2, label: 'Podnaslov', action: () => exec('formatBlock', '<h2>') },
    { icon: Heading3, label: 'Manji podnaslov', action: () => exec('formatBlock', '<h3>') },
    { icon: List, label: 'Popis', action: () => exec('insertUnorderedList') },
    { icon: ListOrdered, label: 'Numerirani popis', action: () => exec('insertOrderedList') },
    { icon: Quote, label: 'Citat', action: () => exec('formatBlock', '<blockquote>') },
  ];

  return (
    <div className="rounded-md border border-input bg-background">
      <div className="flex flex-wrap gap-1 border-b border-border p-2">
        {tools.map(({ icon: Icon, label, action }) => (
          <Button key={label} type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={label} title={label}
            onMouseDown={(e) => e.preventDefault()} onClick={action}>
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        contentEditable
        data-placeholder={placeholder}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
        onInput={() => ref.current && onChange(sanitizeRichText(ref.current.innerHTML))}
        onBlur={() => { rememberSelection(); ref.current && onChange(sanitizeRichText(ref.current.innerHTML)); }}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
        }}
        className="memorial-prose min-h-[220px] w-full px-4 py-3 text-base leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-b-md empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
      />
    </div>
  );
};

export default RichTextEditor;
