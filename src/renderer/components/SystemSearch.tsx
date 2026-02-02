/** Search input with dropdown: local DB search then EDSM search; select result to set current system and load bodies (local or EDSM); respects EDSM spoiler-free. */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore, useEdsmSpoilerFree } from '../stores/appStore';
import type { System } from '@shared/types';
import { parseSystem, parseCelestialBodyArray } from '../utils/boundarySchemas';
import { convertEDSMBodyToCelestialBody, type EDSMBodyInfo } from '../utils/edsmUtils';

interface SearchResult {
  system: System;
  source: 'local' | 'edsm';
}

interface EDSMSystemResult {
  name: string;
  id: number;
  id64: number;
  coords?: {
    x: number;
    y: number;
    z: number;
  };
}

function SystemSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [edsmSearching, setEdsmSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [edsmError, setEdsmError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { setCurrentSystem, addBody } = useAppStore(
    useShallow((s) => ({ setCurrentSystem: s.setCurrentSystem, addBody: s.addBody }))
  );
  const edsmSpoilerFree = useEdsmSpoilerFree();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setResults([]);
      setNoResults(false);
      setEdsmError(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setNoResults(false);
    setEdsmError(null);

    try {
      // First, search local database
      const localResults = await window.electron.searchSystems(searchQuery, 10);
      
      if (localResults && localResults.length > 0) {
        setResults(localResults.map((system: System) => ({ system, source: 'local' as const })));
        setIsSearching(false);
        return;
      }

      // If spoiler-free mode is enabled, don't search EDSM
      if (edsmSpoilerFree) {
        setResults([]);
        setNoResults(true);
        setIsSearching(false);
        return;
      }

      // If no local results and spoiler-free is disabled, search EDSM using prefix search
      setEdsmSearching(true);
      
      try {
        // Clear any previous EDSM error before searching
        await window.electron.edsmClearLastError();
        
        console.log(`[Search] Calling EDSM search for: "${searchQuery}"`);
        // Use the new prefix search endpoint
        const edsmResults = await window.electron.edsmSearchSystems(searchQuery, 10);
        console.log(`[Search] EDSM search results: ${edsmResults?.length ?? 0} systems`);
        
        // Check for EDSM errors
        const lastError = await window.electron.edsmGetLastError();
        if (lastError) {
          console.log(`[Search] EDSM lastError:`, lastError);
          setEdsmError(lastError);
        }
        
        if (edsmResults && edsmResults.length > 0) {
          // Convert EDSM results to System-like objects
          const convertedResults: SearchResult[] = edsmResults.map(edsmResult => ({
            system: {
              id: 0, // Not from our DB
              systemAddress: edsmResult.id64 || 0,
              name: edsmResult.name,
              starPosX: edsmResult.coords?.x || 0,
              starPosY: edsmResult.coords?.y || 0,
              starPosZ: edsmResult.coords?.z || 0,
              firstVisited: new Date().toISOString(),
              lastVisited: new Date().toISOString(),
              bodyCount: null, // Will be loaded when selected
              discoveredCount: 0,
              mappedCount: 0,
              totalValue: 0,
              estimatedFssValue: 0,
              estimatedDssValue: 0,
              allBodiesFound: false,
            },
            source: 'edsm' as const,
          }));
          
          setResults(convertedResults);
          setEdsmError(null); // Clear error if we got results
        } else {
          setResults([]);
          // Only show "no results" if there wasn't an error
          if (!lastError) {
            setNoResults(true);
          }
        }
      } catch (err) {
        console.error('EDSM search failed:', err);
        setResults([]);
        setEdsmError('EDSM request failed');
      }
      
      setEdsmSearching(false);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    }
    
    setIsSearching(false);
  }, [edsmSpoilerFree]);

  // Handle input change with debounce
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  }, [performSearch]);

  // Handle selecting a result
  const handleSelectResult = useCallback(async (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);

    const system = parseSystem(result.system);
    if (!system) return;

    if (result.source === 'local') {
      // Load local system (store will fetch bodies via getSystemBodies)
      setCurrentSystem(system);
      const rawBodies = await window.electron.getSystemBodies(system.id);
      const localBodies = parseCelestialBodyArray(rawBodies);
      localBodies.forEach((body) => addBody(body));
      
      // If spoiler-free is disabled, also fetch EDSM bodies to supplement local data
      if (!edsmSpoilerFree) {
        try {
          const edsmBodies = await window.electron.edsmGetSystemBodies(result.system.name);
          if (edsmBodies && edsmBodies.bodies && edsmBodies.bodies.length > 0) {
            console.log(`[Search] Supplementing with ${edsmBodies.bodies.length} EDSM bodies`);
            
            // Add EDSM bodies that we don't have locally (addBody handles duplicates)
            edsmBodies.bodies.forEach((edsmBody: EDSMBodyInfo) => {
              const celestialBody = convertEDSMBodyToCelestialBody(edsmBody);
              addBody(celestialBody);
            });
          }
        } catch (err) {
          console.log('[Search] Could not fetch EDSM bodies for local system:', err);
        }
      }
    } else {
      // For EDSM results, load bodies from EDSM first, then set system
      try {
        const edsmBodies = await window.electron.edsmGetSystemBodies(system.name);
        
        const systemWithBodyCount: System = {
          ...system,
          bodyCount: edsmBodies?.bodyCount ?? system.bodyCount,
          discoveredCount: edsmBodies?.bodies?.length ?? 0,
        };
        
        setCurrentSystem(systemWithBodyCount);
        
        if (edsmBodies && edsmBodies.bodies && edsmBodies.bodies.length > 0) {
          console.log(`[Search] Loading ${edsmBodies.bodies.length} bodies from EDSM`);
          
          edsmBodies.bodies.forEach((edsmBody: EDSMBodyInfo) => {
            const celestialBody = convertEDSMBodyToCelestialBody(edsmBody);
            addBody(celestialBody);
          });
        } else {
          console.log('[Search] No EDSM body data available for this system');
        }
      } catch (err) {
        console.error('[Search] Failed to load EDSM bodies:', err);
        // Still set the system even if bodies failed to load
        setCurrentSystem(result.system);
      }
    }
  }, [setCurrentSystem, addBody, edsmSpoilerFree]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && results.length > 0) {
      const first = results[0];
      if (first) handleSelectResult(first);
    }
  }, [results, handleSelectResult]);

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search system..."
          className="w-48 px-3 py-1.5 pl-8 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-400"
        />
        <svg 
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        
        {/* Loading indicator */}
        {(isSearching || edsmSearching) && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (query.length >= 2) && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-64 overflow-auto"
        >
          {results.length > 0 ? (
            <ul>
              {results.map((result, index) => (
                <li key={`${result.system.name}-${index}`}>
                  <button
                    onClick={() => handleSelectResult(result)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {result.system.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {result.system.starPosX.toFixed(2)} / {result.system.starPosY.toFixed(2)} / {result.system.starPosZ.toFixed(2)}
                      </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      result.source === 'local' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      {result.source === 'local' ? 'Local' : 'EDSM'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : edsmError ? (
            <div className="px-3 py-3 text-center">
              <div className="text-sm text-red-500 dark:text-red-400">
                {edsmError}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                EDSM may be temporarily unavailable
              </div>
            </div>
          ) : noResults ? (
            <div className="px-3 py-3 text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                No systems found
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Try a different search term
              </div>
            </div>
          ) : isSearching || edsmSearching ? (
            <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              {edsmSearching ? 'Searching EDSM...' : 'Searching...'}
            </div>
          ) : (
            <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Type to search systems
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SystemSearch;
