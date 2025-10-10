import React, { useEffect, useRef, useState } from 'react';
import { Nostalgist } from 'nostalgist';
import { toCoreId } from '../inputMapping';

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
      x: { code: 'KeyI' },
      y: { code: 'KeyU' },
      l: { code: 'KeyQ' },
      r: { code: 'KeyE' },
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
      x: { code: 'KeyY' },
      y: { code: 'KeyT' },
      l: { code: 'KeyR' },
      r: { code: 'KeyF' },
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
  // Track which D-pad direction is currently active for continuous sliding
  const activeDpadDirection = useRef(null);

  // Launch Nostalgist with a File object (ROM)
  const launchWithRomFile = async (file) => {
    if (!file) return;
    setStatus('loading');

    try {
      // Detect if we're on mobile for performance optimizations
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const canvas = document.getElementById('nostalgist-canvas');
      
      // Reduce canvas resolution on mobile for better performance
      if (isMobile && canvas) {
        const scale = window.devicePixelRatio > 1 ? 1 : 1; // Force 1x on mobile
        canvas.style.imageRendering = 'pixelated'; // Sharp pixels, no smoothing
      }
      
      nostalgistRef.current = await Nostalgist.launch({
        core: 'snes9x',
        element: canvas,
        rom: file,
        // Mobile-specific performance optimizations
        retroarchConfig: {
          video_vsync: true,
          video_threaded: true,
          video_smooth: false, // Disable filtering for better performance
          video_frame_delay: isMobile ? 1 : 0, // Slight delay on mobile to reduce CPU load
          video_scale: isMobile ? 1 : 2, // Lower resolution scaling on mobile
          audio_enable: true,
          audio_sync: true,
          audio_latency: isMobile ? 128 : 64, // Higher latency on mobile to prevent audio crackling
          audio_resampler_quality: isMobile ? 1 : 2, // Lower quality resampling on mobile
          audio_block_frames: isMobile ? 8 : 4, // Larger audio blocks on mobile
          rewind_enable: false, // Disable rewind to save memory
          savestate_thumbnail_enable: false, // Disable thumbnails
          video_max_swapchain_images: isMobile ? 2 : 3, // Reduce buffer on mobile
          fastforward_ratio: 1.0, // Disable fast forward
        },
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

  // Auto-trigger ROM picker on first load if no ROM is loaded
  useEffect(() => {
    if (status === 'idle') {
      // Small delay to let the component render first
      const timer = setTimeout(() => {
        triggerRomPicker();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

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
  // Only poll if gamepads are actually connected to save resources
  useEffect(() => {
    let intervalId = null;
    let hasGamepad = false;

    const checkGamepads = () => {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      hasGamepad = gps.some(gp => gp !== null);
    };

    const pollGamepad = () => {
      if (!hasGamepad) return; // Skip if no gamepad connected
      
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
    };

    // Check for gamepads on connect/disconnect
    window.addEventListener('gamepadconnected', checkGamepads);
    window.addEventListener('gamepaddisconnected', checkGamepads);
    checkGamepads();

    // Poll every 16ms (~60fps) only if gamepad is connected
    intervalId = setInterval(pollGamepad, 16);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('gamepadconnected', checkGamepads);
      window.removeEventListener('gamepaddisconnected', checkGamepads);
    };
  }, []);

  // Pointer/touch handlers for on-screen controls
  const handleVirtualPress = (buttonName, player = 'p1') => {
    // visual feedback
    setActiveButtons((prev) => ({ ...prev, [player]: { ...(prev[player] || {}), [buttonName]: true } }));
    // send pressDown to Nostalgist using central mapping module
    const id = toCoreId(buttonName, player === 'p2' ? 2 : 1);
    try {
      if (nostalgistRef.current && typeof nostalgistRef.current.pressDown === 'function') {
        nostalgistRef.current.pressDown(id);
      } else if (nostalgistRef.current && typeof nostalgistRef.current.press === 'function') {
        nostalgistRef.current.press(id);
      }
    } catch (e) {}
  };

  const handleVirtualRelease = (buttonName, player = 'p1') => {
    setActiveButtons((prev) => ({ ...prev, [player]: { ...(prev[player] || {}), [buttonName]: false } }));
    const id = toCoreId(buttonName, player === 'p2' ? 2 : 1);
    try {
      if (nostalgistRef.current && typeof nostalgistRef.current.pressUp === 'function') {
        nostalgistRef.current.pressUp(id);
      }
    } catch (e) {}
  };

  // D-pad continuous sliding: detect which zone the pointer is over
  const handleDpadMove = (e) => {
    const dpadEl = e.currentTarget;
    const rect = dpadEl.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    
    // Determine which zone: divide into 9 regions (3x3 grid)
    // Center 50% is neutral, outer regions are directional
    let newDirection = null;
    const xRatio = x / w;
    const yRatio = y / h;
    
    // Prioritize the strongest direction
    if (yRatio < 0.33) {
      newDirection = 'up';
    } else if (yRatio > 0.67) {
      newDirection = 'down';
    } else if (xRatio < 0.33) {
      newDirection = 'left';
    } else if (xRatio > 0.67) {
      newDirection = 'right';
    }
    
    // If direction changed, release old and press new
    if (newDirection !== activeDpadDirection.current) {
      if (activeDpadDirection.current) {
        handleVirtualRelease(activeDpadDirection.current);
      }
      if (newDirection) {
        handleVirtualPress(newDirection);
      }
      activeDpadDirection.current = newDirection;
    }
  };

  const handleDpadStart = (e) => {
    e.preventDefault();
    handleDpadMove(e);
  };

  const handleDpadEnd = (e) => {
    e.preventDefault();
    if (activeDpadDirection.current) {
      handleVirtualRelease(activeDpadDirection.current);
      activeDpadDirection.current = null;
    }
  };

  return (
    <div className="room-backdrop">
      <div className="room-decor">
        <div className="tv-area">
          <div className="tv-frame">
            <div className="tv-screen-window crt-flicker">
              {/* canvas container */}
              <div id="nostalgist-wrapper" className="relative w-full h-full bg-black">
                <canvas id="nostalgist-canvas" ref={containerRef} className="w-full h-full block bg-black" />
                <div className="scanline-overlay absolute inset-0 pointer-events-none" />
                
                {/* Show message when no ROM is loaded */}
                {status === 'idle' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center px-6">
                      <div className="text-[#8effd6] text-sm mb-3" style={{ fontFamily: "'Press Start 2P', monospace", textShadow: '0 0 10px rgba(102,255,204,0.6)' }}>
                        No ROM Loaded
                      </div>
                      <div className="text-[#9afbd8]/70 text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                        Click "Load ROM" above
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* buttons above the CRT (positioned via CSS) */}
          <div className="tv-buttons">
            <button className="tv-button" onClick={triggerRomPicker}>Load ROM</button>
            <button className="tv-button" onClick={toggleFullscreen}>Full Screen</button>
            <button className="tv-button" onClick={saveState}>Save State</button>
            <button className="tv-button" onClick={() => loadStateInputRef.current && loadStateInputRef.current.click()}>Load State</button>
          </div>

          {/* controller below the TV frame (centered) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <div className="controller-area" aria-hidden>
              {/* Shoulder buttons */}
              <div className="shoulder-buttons">
                <div
                  className={`shoulder-button l ${activeButtons.p1?.l ? 'pressed' : ''}`}
                  onPointerDown={() => handleVirtualPress('l')}
                  onPointerUp={() => handleVirtualRelease('l')}
                  onTouchStart={() => handleVirtualPress('l')}
                  onTouchEnd={() => handleVirtualRelease('l')}
                >L</div>
                <div
                  className={`shoulder-button r ${activeButtons.p1?.r ? 'pressed' : ''}`}
                  onPointerDown={() => handleVirtualPress('r')}
                  onPointerUp={() => handleVirtualRelease('r')}
                  onTouchStart={() => handleVirtualPress('r')}
                  onTouchEnd={() => handleVirtualRelease('r')}
                >R</div>
              </div>

              {/* Main controls row */}
              <div className="main-controls-row">
                <div 
                  className="dpad"
                  onPointerDown={handleDpadStart}
                  onPointerMove={handleDpadMove}
                  onPointerUp={handleDpadEnd}
                  onPointerLeave={handleDpadEnd}
                  onPointerCancel={handleDpadEnd}
                  onTouchStart={handleDpadStart}
                  onTouchMove={handleDpadMove}
                  onTouchEnd={handleDpadEnd}
                  onTouchCancel={handleDpadEnd}
                >
                  {/* Visual indicators for active directions */}
                  <div className={`dpad-zone up ${activeButtons.p1?.up ? 'pressed' : ''}`} />
                  <div className={`dpad-zone down ${activeButtons.p1?.down ? 'pressed' : ''}`} />
                  <div className={`dpad-zone left ${activeButtons.p1?.left ? 'pressed' : ''}`} />
                  <div className={`dpad-zone right ${activeButtons.p1?.right ? 'pressed' : ''}`} />
                </div>

                {/* Center buttons (Start/Select) */}
                <div className="center-buttons">
                  <div
                    className={`center-button select ${activeButtons.p1?.select ? 'pressed' : ''}`}
                    onPointerDown={() => handleVirtualPress('select')}
                    onPointerUp={() => handleVirtualRelease('select')}
                    onTouchStart={() => handleVirtualPress('select')}
                    onTouchEnd={() => handleVirtualRelease('select')}
                  >SELECT</div>
                  <div
                    className={`center-button start ${activeButtons.p1?.start ? 'pressed' : ''}`}
                    onPointerDown={() => handleVirtualPress('start')}
                    onPointerUp={() => handleVirtualRelease('start')}
                    onTouchStart={() => handleVirtualPress('start')}
                    onTouchEnd={() => handleVirtualRelease('start')}
                  >START</div>
                </div>

                <div className="face-buttons">
              <div
                className={`face-button y ${activeButtons.p1 && activeButtons.p1['y'] ? 'pressed' : ''}`}
                onPointerDown={() => handleVirtualPress('y')}
                onPointerUp={() => handleVirtualRelease('y')}
                onTouchStart={() => handleVirtualPress('y')}
                onTouchEnd={() => handleVirtualRelease('y')}
              >Y</div>
              <div
                className={`face-button x ${activeButtons.p1 && activeButtons.p1['x'] ? 'pressed' : ''}`}
                onPointerDown={() => handleVirtualPress('x')}
                onPointerUp={() => handleVirtualRelease('x')}
                onTouchStart={() => handleVirtualPress('x')}
                onTouchEnd={() => handleVirtualRelease('x')}
              >X</div>
              <div
                className={`face-button a ${activeButtons.p1 && activeButtons.p1['a'] ? 'pressed' : ''}`}
                onPointerDown={() => handleVirtualPress('a')}
                onPointerUp={() => handleVirtualRelease('a')}
                onTouchStart={() => handleVirtualPress('a')}
                onTouchEnd={() => handleVirtualRelease('a')}
              >A</div>
              <div
                className={`face-button b ${activeButtons.p1 && activeButtons.p1['b'] ? 'pressed' : ''}`}
                onPointerDown={() => handleVirtualPress('b')}
                onPointerUp={() => handleVirtualRelease('b')}
                onTouchStart={() => handleVirtualPress('b')}
                onTouchEnd={() => handleVirtualRelease('b')}
              >B</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden inputs */}
      <input ref={romInputRef} type="file" accept=".smc,.sfc,application/octet-stream" className="hidden" onChange={onRomSelected} />
      <input ref={loadStateInputRef} type="file" accept=".state,application/octet-stream" className="hidden" onChange={onLoadStateFile} />

      <div className="mt-3 text-xs text-[#9afbd8]/80">
        Status: {status}
        {status === 'idle' && <span className="ml-2">(Select a ROM file to begin)</span>}
      </div>
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


