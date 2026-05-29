import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlannerStore, type CountMode } from '../store/planner';
import { NumericInput } from '../components/NumericInput';

export function StartPage() {
  const navigate = useNavigate();
  const state = usePlannerStore();

  const [budget, setBudget] = useState<number>(state.budget);
  const [participantCount, setParticipantCount] = useState<number>(state.participantCount);
  const [mode, setMode] = useState<CountMode>(state.itemCountMode);
  const [min, setMin] = useState<number | null>(state.itemCountMin);
  const [max, setMax] = useState<number | null>(state.itemCountMax);
  const [fixed, setFixed] = useState<number | null>(state.itemCountFixed);

  const start = () => {
    if (!budget || !participantCount) {
      alert('予算と参加人数を入力してください');
      return;
    }
    if (mode === 'fixed' && !fixed) {
      alert('「固定」モードでは個数を入力してください');
      return;
    }
    if (mode === 'range' && !min && !max) {
      alert('「範囲」モードでは最小か最大のどちらかを入力してください');
      return;
    }
    state.setStart({
      budget,
      participantCount,
      itemCountMode: mode,
      itemCountMin: mode === 'range' ? min : null,
      itemCountMax: mode === 'range' ? max : null,
      itemCountFixed: mode === 'fixed' ? fixed : null,
    });
    navigate('/board');
  };

  const reset = () => {
    if (!confirm('保存データをリセットします。よろしいですか？')) return;
    state.reset();
    setBudget(200000);
    setParticipantCount(30);
    setMode('range');
    setMin(10);
    setMax(20);
    setFixed(null);
  };

  return (
    <div className="shell shell-center">
      <section className="hero">
        <div className="hero-issue">
          <span>Vol. 1 · ビンゴ景品プランナー</span>
          <span className="hero-issue-mono">N°01 / 2026</span>
        </div>
        <h1 className="hero-title">
          <span className="t-hero">Gift</span>{' '}
          <span className="t-hero-italic">Planner</span>
        </h1>
        <p className="hero-tag">
          予算ピッタリで景品を仕分け、自動最適化。
          <br />
          必須を指定し、残りは候補から組み合わせる。
        </p>
      </section>

      <section className="form-pad">
        <div className="section-rule">Setup</div>

        <div className="field">
          <label className="field-label" htmlFor="budget">
            予算（円）
          </label>
          <NumericInput
            ariaLabel="予算"
            value={budget}
            onChange={setBudget}
            className="input input-mono"
            style={{ textAlign: 'right', fontSize: 18 }}
          />
        </div>

        <div className="field">
          <label className="field-label">景品の個数</label>
          <div className="mode-list">
            <ModeRow
              modeKey="range"
              currentMode={mode}
              label="範囲で指定"
              onSelect={() => setMode('range')}
            >
              <span className="mode-inputs">
                <NumericInput
                  ariaLabel="最小個数"
                  value={min}
                  onChange={setMin}
                  placeholder="最小"
                  className="input input-mini input-mono"
                  style={{ width: 64, textAlign: 'center' }}
                  allowEmpty
                />
                <span className="t-sub">〜</span>
                <NumericInput
                  ariaLabel="最大個数"
                  value={max}
                  onChange={setMax}
                  placeholder="最大"
                  className="input input-mini input-mono"
                  style={{ width: 64, textAlign: 'center' }}
                  allowEmpty
                />
                <span className="t-sub" style={{ fontSize: 11, letterSpacing: '0.04em' }}>
                  個
                </span>
              </span>
            </ModeRow>

            <ModeRow
              modeKey="fixed"
              currentMode={mode}
              label="固定"
              onSelect={() => setMode('fixed')}
            >
              <span className="mode-inputs">
                <NumericInput
                  ariaLabel="固定個数"
                  value={fixed}
                  onChange={setFixed}
                  placeholder="個数"
                  className="input input-mini input-mono"
                  style={{ width: 72, textAlign: 'center' }}
                  allowEmpty
                />
                <span className="t-sub" style={{ fontSize: 11, letterSpacing: '0.04em' }}>
                  個
                </span>
              </span>
            </ModeRow>

            <ModeRow
              modeKey="any"
              currentMode={mode}
              label="指定しない"
              onSelect={() => setMode('any')}
            />
          </div>
          <p
            className="t-muted"
            style={{
              fontSize: 10,
              margin: '6px 0 0',
              letterSpacing: '0.04em',
              fontFamily: 'var(--serif)',
              fontStyle: 'italic',
            }}
          >
            範囲モード — 片方だけの入力で「下限のみ」「上限のみ」になります。
          </p>
        </div>

        <div className="field" style={{ marginBottom: 32 }}>
          <label className="field-label" htmlFor="participantCount">
            参加人数
          </label>
          <NumericInput
            ariaLabel="参加人数"
            value={participantCount}
            onChange={setParticipantCount}
            className="input input-mono"
            style={{ textAlign: 'right', fontSize: 18 }}
          />
        </div>

        <div className="rule-double" style={{ margin: '0 0 24px' }} />

        <div className="flex items-center justify-between gap-3">
          <button className="btn btn-link btn-danger" onClick={reset}>
            保存データをリセット
          </button>
          <button className="btn" onClick={start}>
            始める →
          </button>
        </div>

        <p
          className="t-muted t-serif-italic"
          style={{
            fontSize: 12,
            textAlign: 'center',
            marginTop: 32,
            letterSpacing: 0,
          }}
        >
          — 入力はブラウザに保存されます。サーバー送信なし —
        </p>
      </section>
    </div>
  );
}

function ModeRow({
  modeKey,
  currentMode,
  label,
  onSelect,
  children,
}: {
  modeKey: CountMode;
  currentMode: CountMode;
  label: string;
  onSelect: () => void;
  children?: React.ReactNode;
}) {
  const isActive = currentMode === modeKey;
  return (
    <label
      className={`mode-row${isActive ? ' active' : ''}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT') return;
        onSelect();
      }}
    >
      <input
        type="radio"
        name="countMode"
        value={modeKey}
        className="mode-radio"
        checked={isActive}
        onChange={onSelect}
      />
      <span className="mode-label">{label}</span>
      {children}
    </label>
  );
}
