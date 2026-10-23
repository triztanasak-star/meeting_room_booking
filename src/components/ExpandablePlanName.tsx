import { useId, useLayoutEffect, useRef, useState } from 'react';

interface ExpandablePlanNameProps {
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export default function ExpandablePlanName({ value, onChange, className, placeholder }: ExpandablePlanNameProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLTextAreaElement | HTMLDivElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const measure = () => {
      // Measure the collapsed content even while it is expanded.
      content.style.height = onChange ? '31px' : '21px';
      setOverflowing(content.scrollHeight > content.clientHeight + 1);
      if (expanded) content.style.height = `${content.scrollHeight}px`;
    };

    measure();
    let previousWidth = container.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const width = container.getBoundingClientRect().width;
      if (width !== previousWidth) {
        previousWidth = width;
        measure();
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [value, expanded, onChange]);

  return (
    <div ref={containerRef} style={{ flex: 1, minWidth: 0 }}>
      {onChange ? (
        <textarea
          ref={(element) => { contentRef.current = element; }}
          id={id}
          className={className}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          rows={1}
          style={{ resize: 'none', overflow: 'hidden', height: 31, minHeight: 31, lineHeight: '1.4', overflowWrap: 'anywhere' }}
        />
      ) : (
        <div ref={(element) => { contentRef.current = element; }} id={id} style={{ height: 21, lineHeight: '21px', overflow: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {value}
        </div>
      )}
      {overflowing && (
        <button
          type="button"
          className="btn btn-link p-0 d-block"
          style={{ fontSize: '0.75rem' }}
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((previous) => !previous)}
        >
          {expanded ? 'Thu gọn' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}
