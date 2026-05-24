import { useEffect } from 'react';
import { useUiStore } from '@/stores/ui';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      if (isCtrlOrCmd && event.key === 'h') {
        event.preventDefault();
        useUiStore.getState().openHistory();
        return;
      }

      if (isCtrlOrCmd && event.key === ',') {
        event.preventDefault();
        useUiStore.getState().openSettings();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const unsub1 = window.api.events.on('ui:openHistory', () => {
      useUiStore.getState().openHistory();
    });
    const unsub2 = window.api.events.on('ui:openSettings', () => {
      useUiStore.getState().openSettings();
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, []);
}
