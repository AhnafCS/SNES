import React, { useEffect, useRef, useState } from 'react';
import { Nostalgist } from 'nostalgist';

/*
  src/components/EmulatorScreen.jsx
  - Uses Nostalgist (RetroArch WASM wrapper) to launch the built-in `snes9x`
    core from CDN. This component renders the emulator into `containerRef` and
    exposes simple UI for ROM upload, fullscreen, and save/load state.

  Notes:
  - Nostalgist.launch accepts a File object for the `rom` option and will
    instantiate the selected core in the provided DOM element.
  - saveState/loadState are called on the Nostalgist instance if available.
  - The component cleans up by calling `exit()` on unmount.
*/

export default function EmulatorScreen() {
  const containerRef = useRef(null);
  const nostalgistRef = useRef(null);
  const romInputRef = useRef(null);
  const loadStateInputRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | running | error
  const [errorMessage, setErrorMessage] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  // Control mappings: support player 1 and player 2. Each mapping maps
  // logical control names to keyboard `code` strings (e.g. 'KeyK', 'ArrowUp').
  const defaultMappings = {
    p1: {
      up: { code: 'ArrowUp' },
      left: { code: 'ArrowLeft' },
      right: { code: 'ArrowRight' },
      down: { code: 'ArrowDown' },
      a: { code: 'KeyK' },
      b: { code: 'KeyJ' },
      start: { code: 'Enter' },
      select: { code: 'ShiftLeft' },
    },
    p2: {
      up: { code: 'KeyW' },
      left: { code: 'KeyA' },
      right: { code: 'KeyD' },
      down: { code: 'KeyS' },
      a: { code: 'KeyI' },
      b: { code: 'KeyU' },
      start: { code: 'KeyO' },
      select: { code: 'KeyP' },
    },
  };

  const [mappings, setMappings] = useState(() => {
    try {
      const raw = localStorage.getItem('snes_mappings_v1');
      if (!raw) return defaultMappings;
      const parsed = JSON.parse(raw);
      // If stored format is flat (old) migrate into p1
      if (parsed && parsed.p1 && parsed.p2) return parsed;
      return { p1: parsed, p2: defaultMappings.p2 };
    } catch (e) {
      return defaultMappings;
    }
  });

  // Which control is currently waiting for a key press: { player: 'p1'|'p2', key: 'a' } or null
  const [awaiting, setAwaiting] = useState(null);
  // Core-reported default mappings (queried from Nostalgist instance)
  const [coreMappings, setCoreMappings] = useState(null);
  const [activeButtons, setActiveButtons] = useState({ p1: {}, p2: {} });

  // Launch Nostalgist with a File object (ROM)
  const launchWithRomFile = async (file) => {
    if (!file) return;
    setStatus('loading');

    // Debug: ensure the container ref is valid and log helpful info
    console.log('containerRef.current:', containerRef.current);
    if (containerRef.current) {
      console.log('nodeType:', containerRef.current.nodeType, 'tagName:', containerRef.current.tagName);
    } else {
      console.warn('containerRef is not attached to DOM yet');
    }

    try {
      // Nostalgist will fetch the snes9x core via its configured CDN internally
      // Nostalgist accepts a selector string or an element. Passing a selector
      // (#nostalgist-container) avoids cases where React ref wrappers confuse
      // the library. Ensure the container element has the matching id below.
      nostalgistRef.current = await Nostalgist.launch({
        core: 'snes9x',
        // Pass the canvas element directly to satisfy Nostalgist's element check
        element: document.getElementById('nostalgist-canvas'),
        rom: file,
      });

      setStatus('running');
      // After launch, wait for the core to be ready then query its keyboard mapping table
      waitForCoreReady().then(() => {
        updateCoreMappings();
        setTimeout(updateCoreMappings, 700);
        setTimeout(updateCoreMappings, 2200);
      }).catch(() => {
        // fallback: still attempt an immediate update
        updateCoreMappings();
      });
      console.log('Nostalgist launched with snes9x core');
    } catch (err) {
      console.error('Failed to launch Nostalgist:', err);
      // Capture error details for UI debugging
      setErrorMessage(err && err.message ? err.message : String(err));
      setErrorDetails(err && err.stack ? err.stack : null);
      setStatus('error');
    }
  };

  // Wait until Nostalgist reports a running/ready status (timeout 5s)
  const waitForCoreReady = async () => {
    const n = nostalgistRef.current;
    if (!n) return Promise.reject(new Error('no instance'));
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const check = () => {
        try {
          if (typeof n.getStatus === 'function') {
            const s = n.getStatus();
            if (s === 'running' || s === 'ready' || s === 'started') return resolve();
          }
        } catch (e) {
          // ignore
        }
        if (Date.now() - start > 5000) return reject(new Error('timeout waiting for core'));
        setTimeout(check, 200);
      };
      check();
    });
  };

  // Query the Nostalgist instance for keyboard codes for SNES buttons for P1/P2
  const updateCoreMappings = () => {
    const n = nostalgistRef.current;
    if (!n) return;
    // Standard SNES buttons
    const buttons = ['up','down','left','right','a','b','x','y','l','r','start','select'];
    const result = { p1: {}, p2: {} };
    try {
      for (const b of buttons) {
        try {
          // getKeyboardCode(button, player) exists in the instance implementation
          if (typeof n.getKeyboardCode === 'function') {
            result.p1[b] = n.getKeyboardCode(b, 1) || null;
            result.p2[b] = n.getKeyboardCode(b, 2) || null;
          } else if (typeof n.getEmscripten === 'function') {
            // Advanced: try to fetch Emscripten keyboard mapping via helper (best-effort)
            const mod = n.getEmscripten();
            if (mod && typeof mod.getKeyboardCode === 'function') {
              result.p1[b] = mod.getKeyboardCode(b, 1) || null;
              result.p2[b] = mod.getKeyboardCode(b, 2) || null;
            } else {
              result.p1[b] = null;
              result.p2[b] = null;
            }
          } else {
            result.p1[b] = null;
            result.p2[b] = null;
          }
        } catch (err) {
          result.p1[b] = null;
          result.p2[b] = null;
        }
      }
    } catch (err) {
      console.warn('Failed to build core mappings', err);
    }
    setCoreMappings(result);
  };

  // Helper: human-friendly key label
  const formatKeyLabel = (code) => {
    if (!code) return '—';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code === 'Space') return 'Space';
    if (code === 'Enter') return 'Enter';
    if (code.startsWith('Arrow')) return ({ ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[code] || code);
    if (code.includes('Shift')) return 'Shift';
    if (code.includes('Control')) return 'Ctrl';
    if (code.includes('Alt')) return 'Alt';
    return code;
  };

  // File input handler for ROM selection
  const onRomSelected = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    await launchWithRomFile(f);
  };

  // Save mappings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('snes_mappings_v1', JSON.stringify(mappings));
    } catch (e) {
      console.warn('Failed to persist mappings', e);
    }
  }, [mappings]);

  // Key capture and dispatching
  useEffect(() => {
    const onKeyDown = (e) => {
      // If we're capturing a mapping, bind and exit capture mode
      if (awaiting) {
        if (e.key === 'Escape') {
          setAwaiting(null);
          e.preventDefault();
          return;
        }
        // Ignore modifier-only keys
        if (e.code.startsWith('Shift') || e.code.startsWith('Control') || e.code.startsWith('Alt') || e.key === 'Meta') return;
        setMappings((prev) => ({
          ...prev,
          [awaiting.player]: {
            ...prev[awaiting.player],
            [awaiting.key]: { code: e.code },
          },
        }));
        setAwaiting(null);
        e.preventDefault();
        return;
      }

      // Otherwise, check both player mappings and dispatch mapped control events
      for (const player of ['p1', 'p2']) {
        const map = mappings[player] || {};
        for (const control of Object.keys(map)) {
          if (map[control] && map[control].code === e.code) {
            window.dispatchEvent(new CustomEvent('snes:input', { detail: { control, type: 'down', player } }));
            // Mark visual active
            setActiveButtons((prev) => ({
              ...prev,
              [player]: { ...(prev[player] || {}), [control]: true },
            }));
            e.preventDefault();
          }
        }
      }
    };

    const onKeyUp = (e) => {
      for (const player of ['p1', 'p2']) {
        const map = mappings[player] || {};
        for (const control of Object.keys(map)) {
          if (map[control] && map[control].code === e.code) {
            window.dispatchEvent(new CustomEvent('snes:input', { detail: { control, type: 'up', player } }));
            // Clear visual active
            setActiveButtons((prev) => ({
              ...prev,
              [player]: { ...(prev[player] || {}), [control]: false },
            }));
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [mappings, awaiting]);

  // Wire mapped events to Nostalgist input API using documented instance methods
  // Nostalgist instance provides `pressDown` and `pressUp` (or `press`) for input.
  useEffect(() => {
    const onInput = (e) => {
      const { control, type, player } = e.detail || {};
      if (!nostalgistRef.current) return;
      try {
        // Prefer `pressDown` / `pressUp` if available (documented instance methods)
        if (type === 'down' && typeof nostalgistRef.current.pressDown === 'function') {
          nostalgistRef.current.pressDown(player === 'p2' ? `P2_${control}` : control);
        } else if (type === 'up' && typeof nostalgistRef.current.pressUp === 'function') {
          nostalgistRef.current.pressUp(player === 'p2' ? `P2_${control}` : control);
        } else if (typeof nostalgistRef.current.press === 'function') {
          // fallback: call press with payload
          nostalgistRef.current.press({ control, type, player });
        } else if (typeof nostalgistRef.current.sendCommand === 'function') {
          // advanced API: sendCommand
          nostalgistRef.current.sendCommand({ type: 'input', control, action: type, player });
        }
      } catch (err) {
        // ignore errors from optional APIs
      }
    };

    window.addEventListener('snes:input', onInput);
    return () => window.removeEventListener('snes:input', onInput);
  }, []);

  // Helpers to start/stop remapping
  const beginRemap = (control) => {
    setAwaiting(control);
  };

  const clearMapping = (control) => {
    // control is { player, key }
    setMappings((prev) => ({
      ...prev,
      [control.player]: {
        ...prev[control.player],
        [control.key]: null,
      },
    }));
  };

  const resetMappings = () => {
    setMappings(defaultMappings);
  };

  // Trigger native file picker for ROMs
  const triggerRomPicker = () => romInputRef.current && romInputRef.current.click();

  // Fullscreen toggle for the emulator container
  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  };

  // Save state: call Nostalgist.saveState() and download the returned data as a blob
  const saveState = async () => {
    const n = nostalgistRef.current;
    if (!n || typeof n.saveState !== 'function') return alert('Save state not supported by this core build');

    try {
      // saveState may return ArrayBuffer, Uint8Array, or Blob depending on implementation
      const stateData = await n.saveState();
      let blob = null;
      if (stateData instanceof Blob) {
        blob = stateData;
      } else if (stateData instanceof ArrayBuffer) {
        blob = new Blob([new Uint8Array(stateData)], { type: 'application/octet-stream' });
      } else if (stateData instanceof Uint8Array) {
        blob = new Blob([stateData], { type: 'application/octet-stream' });
      } else {
        // fallback
        blob = new Blob([JSON.stringify(stateData)], { type: 'application/octet-stream' });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'snes_save.state';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Save state failed:', err);
      alert('Failed to save state');
    }
  };

  // Load state: reads a .state file and passes its ArrayBuffer to Nostalgist.loadState()
  const onLoadStateFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!nostalgistRef.current || typeof nostalgistRef.current.loadState !== 'function') {
      return alert('Load state not supported by this core build');
    }

    try {
      const buffer = await f.arrayBuffer();
      await nostalgistRef.current.loadState(buffer);
      alert('State loaded');
    } catch (err) {
      console.error('Load state failed:', err);
      alert('Failed to load state');
    }
  };

  useEffect(() => {
    // Cleanup: ensure Nostalgist exits/cleans resources on unmount
    return () => {
      (async () => {
        try {
          if (nostalgistRef.current && typeof nostalgistRef.current.exit === 'function') {
            await nostalgistRef.current.exit();
            nostalgistRef.current = null;
          }
        } catch (err) {
          console.warn('Error while exiting Nostalgist instance', err);
        }
      })();
    };
  }, []);

  // Gamepad handling: poll connected gamepads and forward inputs
  useEffect(() => {
    let rafId = null;
    const pollGamepad = () => {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of gps) {
        if (!gp) continue;
        // Map first controller buttons to SNES buttons (simple example)
        // Button indices vary by controller; this is a best-effort mapping.
        gp.buttons.forEach((btn, idx) => {
          if (btn.pressed) {
            // Dispatch pressed event per mapping
            window.dispatchEvent(new CustomEvent('snes:gamepad-button', { detail: { index: idx, pressed: true } }));
            // also show visual feedback
            setActiveButtons((prev) => {
              const copy = { p1: { ...prev.p1 }, p2: { ...prev.p2 } };
              // assume gamepad 0 -> p1, 1 -> p2
              const owner = gp.index === 0 ? 'p1' : 'p2';
              copy[owner][`b${idx}`] = true;
              return copy;
            });
          } else {
            setActiveButtons((prev) => {
              const copy = { p1: { ...prev.p1 }, p2: { ...prev.p2 } };
              const owner = gp.index === 0 ? 'p1' : 'p2';
              copy[owner][`b${idx}`] = false;
              return copy;
            });
          }
        });
      }
      rafId = requestAnimationFrame(pollGamepad);
    };

    rafId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="room-backdrop">
      <div className="room-decor">
        <div className="tv-area">
          <div className="tv-frame">
            <div className="tv-screen-window">
              {/* Wrapper containing the canvas Nostalgist will render into, plus overlays */}
              <div id="nostalgist-wrapper" className="relative w-full h-full bg-black">
                {/* Nostalgist requires a canvas element; we create a dedicated canvas */}
                <canvas id="nostalgist-canvas" ref={containerRef} className="w-full h-full block bg-black" />
                {/* scanline overlay */}
                <div className="scanline-overlay absolute inset-0 pointer-events-none" />
              </div>
            </div>

            {/* TV buttons placed at the bottom of the TV frame */}
            <div className="tv-buttons">
              <button className="tv-button" onClick={triggerRomPicker}>LOAD</button>
              <button className="tv-button" onClick={toggleFullscreen}>FULL</button>
              <button className="tv-button" onClick={saveState}>SAVE</button>
              <button className="tv-button" onClick={() => loadStateInputRef.current && loadStateInputRef.current.click()}>LOAD</button>
            </div>
          </div>
        </div>

        {/* Side controls panel with mapping UI */}
        <div className="controls-area">
          <div className="control-panel">
            <div className="flex items-center justify-between">
              <h3 className="text-sm mb-2">Controls (customizable)</h3>
              <div className="flex gap-2">
                <button
                  className="mapping-btn"
                  onClick={() => updateCoreMappings()}
                  title="Query core for its default keyboard mappings"
                >
                  Refresh core
                </button>
                <button
                  className="mapping-btn"
                  onClick={() => {
                    if (!coreMappings) return alert('Core mappings not available');
                    // Sync current mappings to core defaults
                    const synced = { p1: {}, p2: {} };
                    for (const k of Object.keys(coreMappings.p1 || {})) {
                      synced.p1[k] = coreMappings.p1[k] ? { code: coreMappings.p1[k] } : null;
                    }
                    for (const k of Object.keys(coreMappings.p2 || {})) {
                      synced.p2[k] = coreMappings.p2[k] ? { code: coreMappings.p2[k] } : null;
                    }
                    setMappings(synced);
                    alert('Synced mappings to core defaults');
                  }}
                >
                  Sync to core
                </button>
              </div>
            </div>
            {/* Player mappings UI */}
            <div className="text-xs mb-2 font-bold">Player 1</div>
            {Object.keys(mappings.p1).map((key) => (
              <div className="control-row" key={`p1-${key}`}>
                <div className="capitalize">{key}</div>
                <div className="flex items-center gap-2">
                  <button
                    className="mapping-btn"
                    onClick={() => beginRemap({ player: 'p1', key })}
                  >
                    {awaiting && awaiting.player === 'p1' && awaiting.key === key ? 'Press a key...' : formatKeyLabel(mappings.p1[key] ? mappings.p1[key].code : null)}
                  </button>
                  {/* visual active indicator */}
                  <div className="w-3 h-3 rounded-full" style={{ background: activeButtons.p1 && activeButtons.p1[key] ? '#8effd6' : 'rgba(255,255,255,0.03)' }} />
                  {/* show core default if available */}
                  {coreMappings && coreMappings.p1 && coreMappings.p1[key] && (
                    <div className="text-[11px] text-[#9afbd8]/60">core: {formatKeyLabel(coreMappings.p1[key])}</div>
                  )}
                  <button
                    className="mapping-btn"
                    onClick={() => clearMapping({ player: 'p1', key })}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ))}

            <div className="text-xs mb-2 mt-3 font-bold">Player 2</div>
            {Object.keys(mappings.p2).map((key) => (
              <div className="control-row" key={`p2-${key}`}>
                <div className="capitalize">{key}</div>
                <div className="flex items-center gap-2">
                  <button
                    className="mapping-btn"
                    onClick={() => beginRemap({ player: 'p2', key })}
                  >
                    {awaiting && awaiting.player === 'p2' && awaiting.key === key ? 'Press a key...' : formatKeyLabel(mappings.p2[key] ? mappings.p2[key].code : null)}
                  </button>
                  <div className="w-3 h-3 rounded-full" style={{ background: activeButtons.p2 && activeButtons.p2[key] ? '#8effd6' : 'rgba(255,255,255,0.03)' }} />
                  {coreMappings && coreMappings.p2 && coreMappings.p2[key] && (
                    <div className="text-[11px] text-[#9afbd8]/60">core: {formatKeyLabel(coreMappings.p2[key])}</div>
                  )}
                  <button
                    className="mapping-btn"
                    onClick={() => clearMapping({ player: 'p2', key })}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ))}

            <div className="mt-4 text-xs text-[#9afbd8]/70">Click a mapping to rebind. Press ESC to cancel mapping.</div>
            <div className="mt-3 flex gap-2">
              <button className="mapping-btn" onClick={resetMappings}>Reset</button>
              <button className="mapping-btn" onClick={() => { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(mappings)); }}>Copy</button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden inputs */}
      <input ref={romInputRef} type="file" accept=".smc,.sfc,application/octet-stream" className="hidden" onChange={onRomSelected} />
      <input ref={loadStateInputRef} type="file" accept=".state,application/octet-stream" className="hidden" onChange={onLoadStateFile} />

      <div className="mt-3 text-xs text-[#9afbd8]/80">Status: {status}</div>
      {status === 'error' && (
        <div className="mt-2 p-3 bg-red-900/60 rounded text-[12px] max-w-xl">
          <div className="font-bold">Emulator failed to start</div>
          {errorMessage && <div className="mt-1">{errorMessage}</div>}
          {errorDetails && (
            <details className="mt-2 text-xs max-h-40 overflow-auto">
              <summary>Stack / details</summary>
              <pre className="whitespace-pre-wrap">{errorDetails}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}


