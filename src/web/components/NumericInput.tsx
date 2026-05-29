import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { num, parseNum } from '../lib/format';

type Props = {
  value: number | null;
  onChange: (v: number) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  allowEmpty?: boolean;
  onChangeRaw?: (raw: string) => void;
};

export function NumericInput({
  value,
  onChange,
  placeholder,
  className,
  style,
  ariaLabel,
  allowEmpty,
}: Props) {
  const [text, setText] = useState<string>(value != null ? num(value) : '');
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) {
      setText(value != null ? num(value) : '');
    }
  }, [value, focused]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={text}
      placeholder={placeholder}
      className={className}
      style={style}
      aria-label={ariaLabel}
      onChange={(e) => setText(e.target.value)}
      onFocus={(e) => {
        setFocused(true);
        setText(value != null ? String(value) : '');
        requestAnimationFrame(() => e.target.select());
      }}
      onBlur={() => {
        setFocused(false);
        const trimmed = text.trim();
        if (allowEmpty && trimmed === '') {
          setText('');
          // 空入力時は onChange を発火させず親に "null 化" を委ねる（今は呼ばない）
          return;
        }
        const v = parseNum(trimmed);
        onChange(v);
        setText(num(v));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
