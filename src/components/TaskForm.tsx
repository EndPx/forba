'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';

interface TaskFormProps {
  onSubmit: (description: string) => Promise<void>;
  disabled?: boolean;
}

export function TaskForm({ onSubmit, disabled = false }: TaskFormProps) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!description.trim() || loading || disabled) return;
    setLoading(true);
    try {
      await onSubmit(description.trim());
      setDescription('');
    } catch (error) {
      console.error('Failed to submit task:', error);
    } finally {
      setLoading(false);
    }
  }, [description, loading, onSubmit]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && focused) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focused, handleSubmit]);

  return (
    <div className="border border-zinc-200 rounded-lg bg-white p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">New Task</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Describe your goal. Agents will be recruited and paid automatically on-chain.
        </p>
      </div>

      <div className="relative">
        <Textarea
          placeholder="e.g., Research the top crypto wallets of 2024 and write a 500-word comparison blog post…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="min-h-[100px] resize-none text-sm leading-relaxed border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-300 focus-visible:border-zinc-300 placeholder:text-zinc-300 bg-white"
          maxLength={2000}
          disabled={loading || disabled}
        />
        {(loading || disabled) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-md">
            <div className="flex items-center gap-2 text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">{disabled ? 'Processing task…' : 'Dispatching…'}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-300 font-mono tabular-nums">{description.length}/2000</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-300 select-none hidden sm:inline">⌘ + Enter</span>
          <Button
            onClick={handleSubmit}
            disabled={!description.trim() || loading || disabled}
            size="sm"
            className="bg-zinc-900 hover:bg-zinc-700 text-white text-xs px-4 disabled:opacity-30"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Dispatch
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
