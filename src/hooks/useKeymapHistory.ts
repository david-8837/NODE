import { useState, useCallback } from 'react';

export function useKeymapHistory<T>(maxHistory = 20) {
  const [history, setHistory] = useState<T[]>([]);
  const [redoStack, setRedoStack] = useState<T[]>([]);

  const recordSnapshot = useCallback((currentState: T) => {
    setHistory((prev) => [...prev.slice(-(maxHistory - 1)), currentState]);
    setRedoStack([]);
  }, [maxHistory]);

  const undo = useCallback((currentState: T): T | null => {
    if (history.length === 0) return null;
    const previous = history[history.length - 1];
    setRedoStack((prev) => [currentState, ...prev]);
    setHistory((prev) => prev.slice(0, -1));
    return previous;
  }, [history]);

  const redo = useCallback((currentState: T): T | null => {
    if (redoStack.length === 0) return null;
    const next = redoStack[0];
    setHistory((prev) => [...prev, currentState]);
    setRedoStack((prev) => prev.slice(1));
    return next;
  }, [redoStack]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setRedoStack([]);
  }, []);

  return {
    history,
    redoStack,
    canUndo: history.length > 0,
    canRedo: redoStack.length > 0,
    recordSnapshot,
    undo,
    redo,
    clearHistory,
    setHistory,
    setRedoStack,
  };
}
