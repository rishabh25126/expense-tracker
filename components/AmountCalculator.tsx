'use client';

import { useEffect, useState } from 'react';
import Big from 'big.js';

type Operator = 'add' | 'subtract' | 'multiply' | 'divide';

type Props = {
  value: string;
  onAmountChange: (amount: string) => void;
};

const MAX_DISPLAY_LENGTH = 14;

Big.DP = 10;
Big.RM = Big.roundHalfUp;

function trimAmount(value: string): string {
  if (!value.includes('.')) return value;
  const trimmed = value.replace(/\.?0+$/, '');
  return trimmed === '' ? '0' : trimmed;
}

function formatDisplay(value: Big): string {
  return trimAmount(value.round(10).toFixed(10));
}

function formatAmount(value: string): string {
  return trimAmount(Big(normalizeNumberInput(value)).round(2).toFixed(2));
}

function initialDisplay(value: string): string {
  if (!value.trim()) return '0';

  try {
    return formatDisplay(Big(normalizeNumberInput(value)));
  } catch {
    return '0';
  }
}

function normalizeNumberInput(value: string): string {
  if (value.endsWith('.')) return value.slice(0, -1);
  return value;
}

function calculate(left: string, operator: Operator, right: string): string {
  const a = Big(normalizeNumberInput(left));
  const b = Big(normalizeNumberInput(right));

  if (operator === 'add') return formatDisplay(a.plus(b));
  if (operator === 'subtract') return formatDisplay(a.minus(b));
  if (operator === 'multiply') return formatDisplay(a.times(b));

  if (b.eq(0)) {
    throw new Error('Cannot divide by zero.');
  }

  return formatDisplay(a.div(b));
}

const operatorLabels: Record<Operator, string> = {
  add: '+',
  subtract: '-',
  multiply: '*',
  divide: '/',
};

export default function AmountCalculator({ value, onAmountChange }: Props) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [storedValue, setStoredValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [waitingForValue, setWaitingForValue] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const openCalculator = () => {
    setDisplay(initialDisplay(value));
    setStoredValue(null);
    setOperator(null);
    setWaitingForValue(false);
    setError('');
    setOpen(true);
  };

  const appendDigit = (digit: string) => {
    setError('');

    if (waitingForValue) {
      setDisplay(digit);
      setWaitingForValue(false);
      return;
    }

    setDisplay(current => {
      const next = current === '0' ? digit : `${current}${digit}`;
      return next.length > MAX_DISPLAY_LENGTH ? current : next;
    });
  };

  const appendDecimal = () => {
    setError('');

    if (waitingForValue) {
      setDisplay('0.');
      setWaitingForValue(false);
      return;
    }

    setDisplay(current => current.includes('.') ? current : `${current}.`);
  };

  const backspace = () => {
    setError('');

    if (waitingForValue) return;

    setDisplay(current => current.length <= 1 ? '0' : current.slice(0, -1));
  };

  const clear = () => {
    setDisplay('0');
    setStoredValue(null);
    setOperator(null);
    setWaitingForValue(false);
    setError('');
  };

  const applyOperator = (nextOperator: Operator) => {
    setError('');

    if (storedValue !== null && operator && !waitingForValue) {
      try {
        const result = calculate(storedValue, operator, display);
        setDisplay(result);
        setStoredValue(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Calculation failed.');
        setStoredValue(null);
        setOperator(null);
        return;
      }
    } else {
      setStoredValue(display);
    }

    setOperator(nextOperator);
    setWaitingForValue(true);
  };

  const resolvePendingValue = () => {
    if (!operator || storedValue === null || waitingForValue) return display;
    return calculate(storedValue, operator, display);
  };

  const showResult = () => {
    setError('');

    try {
      const result = resolvePendingValue();
      setDisplay(result);
      setStoredValue(null);
      setOperator(null);
      setWaitingForValue(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Calculation failed.');
    }
  };

  const useAmount = () => {
    setError('');

    try {
      const result = resolvePendingValue();
      if (Big(normalizeNumberInput(result)).lt(0)) {
        throw new Error('Amount cannot be negative.');
      }
      onAmountChange(formatAmount(result));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Calculation failed.');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openCalculator}
        className="absolute right-1 top-1 bottom-1 w-11 rounded border border-gray-700 bg-gray-900 text-[11px] font-semibold text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Open amount calculator"
        title="Calculator"
      >
        123
      </button>

      {open && (
        <div
          className="fixed inset-0 z-20 flex items-end justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="amount-calculator-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-xl border border-gray-700 bg-gray-900 p-4 shadow-xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 id="amount-calculator-title" className="text-sm font-semibold text-gray-100">
                Calculator
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-300"
              >
                Close
              </button>
            </div>

            <div className="mb-3 min-h-16 rounded border border-gray-700 bg-gray-950 px-3 py-2 text-right">
              <p className="text-xs text-gray-500">
                {storedValue !== null && operator ? `${storedValue} ${operatorLabels[operator]}` : 'INR'}
              </p>
              <p className="truncate text-3xl font-semibold text-gray-100">{display}</p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <button type="button" onClick={clear} className="h-12 rounded bg-gray-700 text-sm font-medium text-gray-100">
                C
              </button>
              <button type="button" onClick={backspace} className="h-12 rounded bg-gray-700 text-sm font-medium text-gray-100">
                Del
              </button>
              <button type="button" onClick={() => applyOperator('divide')} className="h-12 rounded bg-indigo-600 text-sm font-medium text-white">
                /
              </button>
              <button type="button" onClick={() => applyOperator('multiply')} className="h-12 rounded bg-indigo-600 text-sm font-medium text-white">
                *
              </button>

              {['7', '8', '9'].map(digit => (
                <button key={digit} type="button" onClick={() => appendDigit(digit)} className="h-12 rounded bg-gray-800 text-sm font-medium text-gray-100">
                  {digit}
                </button>
              ))}
              <button type="button" onClick={() => applyOperator('subtract')} className="h-12 rounded bg-indigo-600 text-sm font-medium text-white">
                -
              </button>

              {['4', '5', '6'].map(digit => (
                <button key={digit} type="button" onClick={() => appendDigit(digit)} className="h-12 rounded bg-gray-800 text-sm font-medium text-gray-100">
                  {digit}
                </button>
              ))}
              <button type="button" onClick={() => applyOperator('add')} className="h-12 rounded bg-indigo-600 text-sm font-medium text-white">
                +
              </button>

              {['1', '2', '3'].map(digit => (
                <button key={digit} type="button" onClick={() => appendDigit(digit)} className="h-12 rounded bg-gray-800 text-sm font-medium text-gray-100">
                  {digit}
                </button>
              ))}
              <button type="button" onClick={showResult} className="row-span-2 h-full rounded bg-white text-sm font-semibold text-gray-900">
                =
              </button>

              <button type="button" onClick={() => appendDigit('0')} className="h-12 rounded bg-gray-800 text-sm font-medium text-gray-100">
                0
              </button>
              <button type="button" onClick={appendDecimal} className="h-12 rounded bg-gray-800 text-sm font-medium text-gray-100">
                .
              </button>
              <button type="button" onClick={useAmount} className="h-12 rounded bg-green-600 text-xs font-semibold text-white">
                Use
              </button>
            </div>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
