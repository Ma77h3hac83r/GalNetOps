/** Hook: route planner state, storage, GEC POI, EDSM/visited fetch, reorder, edit. */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../../stores/appStore';
import {
  loadStoredSystemNames,
  saveStoredSystemNames,
  loadStoredPoiNames,
  saveStoredPoiNames,
} from './storage';
import { moveItem } from './utils';
import type { RoutePlannerRow } from './types';

export function useRoutePlanner() {
  const isOpen = useAppStore((state) => state.routePlannerOpen);
  const setRoutePlannerOpen = useAppStore((state) => state.setRoutePlannerOpen);
  const routePlannerPanelWidth = useAppStore(
    (state) => state.routePlannerPanelWidth
  );
  const setRoutePlannerPanelWidth = useAppStore(
    (state) => state.setRoutePlannerPanelWidth
  );

  const initialSystemNames = loadStoredSystemNames();
  const [systemNames, setSystemNames] = useState<string[]>(initialSystemNames);
  const [poiNames, setPoiNames] = useState<string[]>(() =>
    loadStoredPoiNames(initialSystemNames.length)
  );
  const poiNamesRef = useRef<string[]>(poiNames);
  poiNamesRef.current = poiNames;

  const [inputValue, setInputValue] = useState('');
  const [rows, setRows] = useState<RoutePlannerRow[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const editingValueRef = useRef(editingValue);
  editingValueRef.current = editingValue;
  const [copiedRowIndex, setCopiedRowIndex] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [gecPoiBySystem, setGecPoiBySystem] = useState<
    Map<string, string[]> | null
  >(null);

  useEffect(() => {
    if (!isOpen || !window.electron?.getGecPoiList) {
      return;
    }
    let cancelled = false;
    window.electron
      .getGecPoiList()
      .then((list) => {
        if (cancelled) return;
        const bySystem = new Map<string, string[]>();
        for (const { name, galMapSearch } of list) {
          const key = galMapSearch.trim().toLowerCase();
          if (!key) continue;
          const arr = bySystem.get(key) ?? [];
          if (!arr.includes(name)) arr.push(name);
          bySystem.set(key, arr);
        }
        setGecPoiBySystem(bySystem);
      })
      .catch(() => {
        if (!cancelled) setGecPoiBySystem(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const getPoiSuggestionsForSystem = useCallback(
    (systemName: string): string[] => {
      if (!gecPoiBySystem) return [];
      return gecPoiBySystem.get(systemName.trim().toLowerCase()) ?? [];
    },
    [gecPoiBySystem]
  );

  const addSystems = useCallback((text: string) => {
    const toAdd = text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (toAdd.length === 0) return;
    setSystemNames((prev) => {
      const next = [...prev, ...toAdd];
      saveStoredSystemNames(next);
      return next;
    });
    setPoiNames((prev) => {
      const next = [...prev, ...toAdd.map(() => '')];
      saveStoredPoiNames(next);
      return next;
    });
    setInputValue('');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSystems(inputValue);
      }
    },
    [addSystems, inputValue]
  );

  const reorderSystems = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setSystemNames((prev) => {
      const next = moveItem(prev, fromIndex, toIndex);
      saveStoredSystemNames(next);
      return next;
    });
    setPoiNames((prev) => {
      const next = moveItem(prev, fromIndex, toIndex);
      saveStoredPoiNames(next);
      return next;
    });
    setRows((prev) => moveItem(prev, fromIndex, toIndex));
  }, []);

  const setPoiName = useCallback((index: number, value: string) => {
    setPoiNames((prev) => {
      const next = [...prev];
      next[index] = value;
      saveStoredPoiNames(next);
      return next;
    });
    setRows((prev) => {
      const next = [...prev];
      const row = next[index];
      if (row) next[index] = { ...row, poiName: value };
      return next;
    });
  }, []);

  const startEditing = useCallback((index: number, currentName: string) => {
    setEditingIndex(index);
    setEditingValue(currentName);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }, []);

  const commitEdit = useCallback((index: number, currentName: string) => {
    const newName = editingValueRef.current.trim();
    if (newName === currentName || newName === '') {
      setEditingIndex(null);
      setEditingValue('');
      return;
    }
    setSystemNames((prev) => {
      const next = [...prev];
      next[index] = newName;
      saveStoredSystemNames(next);
      return next;
    });
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        name: newName,
        poiName: prev[index]?.poiName ?? '',
        inEdsm: null,
        visited: null,
      };
      return next;
    });
    setEditingIndex(null);
    setEditingValue('');
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditingValue('');
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = routePlannerPanelWidth;
      const onMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        setRoutePlannerPanelWidth(startWidth + delta);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [routePlannerPanelWidth, setRoutePlannerPanelWidth]
  );

  const handleCopySystemName = useCallback((index: number, name: string) => {
    navigator.clipboard.writeText(name).then(
      () => {
        setCopiedRowIndex(index);
        setTimeout(() => setCopiedRowIndex(null), 2000);
      },
      () => {}
    );
  }, []);

  const fetchContentKey =
    systemNames.length > 0 ? [...systemNames].sort().join('\n') : '';

  useEffect(() => {
    if (systemNames.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    const pois = poiNamesRef.current;
    setRows(
      systemNames.map((name, i) => ({
        name,
        poiName: pois[i] ?? '',
        inEdsm: null,
        visited: null,
      }))
    );
    setIsFetching(true);

    const run = async () => {
      const results: Omit<RoutePlannerRow, 'poiName'>[] = await Promise.all(
        systemNames.map(
          async (name): Promise<Omit<RoutePlannerRow, 'poiName'>> => {
            if (cancelled) return { name, inEdsm: null, visited: null };
            const [edsmResult, dbResult] = await Promise.all([
              window.electron.edsmGetSystem(name).catch(() => null),
              window.electron.getSystemByName(name).catch(() => null),
            ]);
            if (cancelled) return { name, inEdsm: null, visited: null };
            return {
              name,
              inEdsm:
                edsmResult != null && Object.keys(edsmResult).length > 0,
              visited: dbResult != null,
            };
          }
        )
      );
      if (!cancelled) {
        const poisNow = poiNamesRef.current;
        setRows(
          results.map((r, i) => ({
            ...r,
            poiName: poisNow[i] ?? '',
          }))
        );
        setIsFetching(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [systemNames.length, fetchContentKey]);

  return {
    isOpen,
    setRoutePlannerOpen,
    routePlannerPanelWidth,
    systemNames,
    inputValue,
    setInputValue,
    rows,
    isFetching,
    draggedIndex,
    setDraggedIndex,
    editingIndex,
    editingValue,
    setEditingValue,
    copiedRowIndex,
    editInputRef,
    addSystems,
    handleKeyDown,
    reorderSystems,
    setPoiName,
    startEditing,
    commitEdit,
    cancelEdit,
    handleResizeStart,
    getPoiSuggestionsForSystem,
    handleCopySystemName,
  };
}
