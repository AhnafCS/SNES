import React, { useEffect, useRef, useState } from 'react';
import { Nostalgist } from 'nostalgist';
import { toCoreId } from '../inputMapping';
import JSZip from 'jszip';

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

// Auto-detect console from ROM file extension
const detectConsoleFromFile = (filename) => {
  const ext = filename.toLowerCase().match(/\.([^.]+)$/)?.[1];
  console.log(`Detecting console for file: ${filename}, extension: ${ext}`);
  
  const consoleMap = {
    // Nintendo - SNES
    'smc': { core: 'snes9x', extensions: '.smc,.sfc,.fig,.swc' },
    'sfc': { core: 'snes9x', extensions: '.smc,.sfc,.fig,.swc' },
    'fig': { core: 'snes9x', extensions: '.smc,.sfc,.fig,.swc' },
    'swc': { core: 'snes9x', extensions: '.smc,.sfc,.fig,.swc' },
    
    // Nintendo - NES (must come before other systems)
    'nes': { core: 'fceumm', extensions: '.nes,.unf,.unif' },
    'unf': { core: 'fceumm', extensions: '.nes,.unf,.unif' },
    'unif': { core: 'fceumm', extensions: '.nes,.unf,.unif' },
    
    // Nintendo - Game Boy Advance
    'gba': { core: 'mgba', extensions: '.gba,.agb' },
    'agb': { core: 'mgba', extensions: '.gba,.agb' },
    
    // Nintendo - Game Boy Color
    'gbc': { core: 'gambatte', extensions: '.gbc' },
    
    // Nintendo - Game Boy
    'gb': { core: 'gambatte', extensions: '.gb' },
    
    // Nintendo - N64
    'n64': { core: 'mupen64plus_next', extensions: '.n64,.z64,.v64' },
    'z64': { core: 'mupen64plus_next', extensions: '.n64,.z64,.v64' },
    'v64': { core: 'mupen64plus_next', extensions: '.n64,.z64,.v64' },
    
    // Nintendo - Nintendo DS
    'nds': { core: 'melonds', extensions: '.nds' },
    
    // Sega - Genesis/Mega Drive
    'md': { core: 'genesis_plus_gx', extensions: '.md,.gen,.smd,.bin' },
    'gen': { core: 'genesis_plus_gx', extensions: '.md,.gen,.smd,.bin' },
    'smd': { core: 'genesis_plus_gx', extensions: '.md,.gen,.smd,.bin' },
    
    // Sega - Master System
    'sms': { core: 'genesis_plus_gx', extensions: '.sms' },
    
    // Sega - Game Gear
    'gg': { core: 'genesis_plus_gx', extensions: '.gg' },
    
    // Sega - CD (requires BIOS)
    'cue': { core: 'genesis_plus_gx', extensions: '.cue,.chd,.iso' },
    'chd': { core: 'genesis_plus_gx', extensions: '.cue,.chd,.iso' },
    'iso': { core: 'genesis_plus_gx', extensions: '.cue,.chd,.iso' },
    
    // Sega - 32X
    '32x': { core: 'picodrive', extensions: '.32x,.bin' },
    
    // Sega - Saturn (requires BIOS)
    'ccd': { core: 'yabause', extensions: '.cue,.ccd,.chd,.iso' },
    
    // Sony - PlayStation
    'cue': { core: 'pcsx_rearmed', extensions: '.cue,.chd,.pbp,.bin' },
    'pbp': { core: 'pcsx_rearmed', extensions: '.cue,.chd,.pbp,.bin' },
    
    // Atari - 2600
    'a26': { core: 'stella', extensions: '.a26,.bin' },
    
    // Atari - 7800
    'a78': { core: 'prosystem', extensions: '.a78' },
    
    // Atari - Lynx
    'lnx': { core: 'handy', extensions: '.lnx,.o' },
    'o': { core: 'handy', extensions: '.lnx,.o' },
    
    // Atari - Jaguar
    'j64': { core: 'virtualjaguar', extensions: '.j64,.jag' },
    'jag': { core: 'virtualjaguar', extensions: '.j64,.jag' },
    
    // PC Engine / TurboGrafx-16
    'pce': { core: 'mednafen_pce_fast', extensions: '.pce,.sgx' },
    'sgx': { core: 'mednafen_pce_fast', extensions: '.pce,.sgx' },
    
    // Neo Geo Pocket
    'ngp': { core: 'mednafen_ngp', extensions: '.ngp,.ngc' },
    'ngc': { core: 'mednafen_ngp', extensions: '.ngp,.ngc' },
    
    // WonderSwan
    'ws': { core: 'mednafen_wswan', extensions: '.ws,.wsc' },
    'wsc': { core: 'mednafen_wswan', extensions: '.ws,.wsc' },
    
    // Virtual Boy
    'vb': { core: 'mednafen_vb', extensions: '.vb,.vboy' },
    'vboy': { core: 'mednafen_vb', extensions: '.vb,.vboy' },
    
    // Arcade - MAME (only for arcade ROMs, not for zipped console ROMs)
    // Note: ZIP files are handled separately to extract and detect the actual ROM inside
    
    // MSX
    'rom': { core: 'bluemsx', extensions: '.rom,.mx1,.mx2,.dsk' },
    'mx1': { core: 'bluemsx', extensions: '.rom,.mx1,.mx2,.dsk' },
    'mx2': { core: 'bluemsx', extensions: '.rom,.mx1,.mx2,.dsk' },
    'dsk': { core: 'bluemsx', extensions: '.rom,.mx1,.mx2,.dsk' },
    
    // Commodore 64
    'd64': { core: 'vice_x64', extensions: '.d64,.t64,.prg' },
    't64': { core: 'vice_x64', extensions: '.d64,.t64,.prg' },
    'prg': { core: 'vice_x64', extensions: '.d64,.t64,.prg' },
    
    // Amstrad CPC
    'cdt': { core: 'cap32', extensions: '.cdt,.dsk' },
    
    // 3DO
    'iso': { core: 'opera', extensions: '.iso,.cue,.chd' },
    
    // Vectrex
    'vec': { core: 'vecx', extensions: '.vec,.gam,.bin' },
    'gam': { core: 'vecx', extensions: '.vec,.gam,.bin' },
    
    // Default fallback
    'bin': { core: 'snes9x', extensions: '.bin' },
  };
  
  const detected = consoleMap[ext];
  if (detected) {
    console.log(`Detected extension: ${ext} -> Core: ${detected.core}`);
    return detected;
  }
  
  console.log(`Unknown extension: ${ext}, defaulting to SNES`);
  return { core: 'snes9x', extensions: '.smc,.sfc' };
};

export default function EmulatorScreen({ core: initialCore = 'snes9x', extensions: initialExtensions = '.smc,.sfc' }) {
  const containerRef = useRef(null);
  const nostalgistRef = useRef(null);
  const romInputRef = useRef(null);
  const loadStateInputRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | running | error
  const [errorMessage, setErrorMessage] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [core, setCore] = useState(initialCore);
  const [extensions, setExtensions] = useState(initialExtensions);
  
  // Sound effects
  const playSound = (soundFile) => {
    try {
      const audio = new Audio(soundFile);
      audio.volume = 0.3; // 30% volume so it's not too loud
      audio.play().catch(e => {
        // Silently fail if sound file not found
        console.debug('Could not play sound:', soundFile, e);
      });
    } catch (e) {
      console.debug('Sound error:', e);
    }
  };
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
  // Track gamepad state to detect button press/release changes
  const gamepadState = useRef({ buttons: {}, axes: {} });
  // Track connected gamepads
  const [connectedGamepads, setConnectedGamepads] = useState([]);

  // Launch Nostalgist with a File object (ROM)
  const launchWithRomFile = async (file, detectedCore = null) => {
    if (!file) return;
    setStatus('loading');

    // Use detected core if provided, otherwise use state
    const coreToUse = detectedCore || core;
    console.log(`Launching emulator with core: ${coreToUse}`);

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
        core: coreToUse,
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

  // Extract ROM from ZIP file
  const extractRomFromZip = async (zipFile) => {
    try {
      const zip = await JSZip.loadAsync(zipFile);
      
      // List of all known ROM extensions (not just current core)
      const allRomExtensions = [
        '.smc', '.sfc', '.fig', '.swc', // SNES
        '.nes', '.unf', '.unif', // NES
        '.gba', '.agb', // GBA
        '.gbc', '.gb', // GB/GBC
        '.n64', '.z64', '.v64', // N64
        '.nds', // DS
        '.md', '.gen', '.smd', // Genesis
        '.sms', '.gg', // SMS/GG
        '.cue', '.chd', '.iso', '.pbp', // CD-based
        '.32x', // 32X
        '.a26', '.a78', // Atari
        '.lnx', '.o', // Lynx
        '.j64', '.jag', // Jaguar
        '.pce', '.sgx', // PC Engine
        '.ngp', '.ngc', // Neo Geo Pocket
        '.ws', '.wsc', // WonderSwan
        '.vb', '.vboy', // Virtual Boy
        '.rom', '.mx1', '.mx2', // MSX
        '.d64', '.t64', '.prg', // C64
        '.cdt', '.dsk', // Amstrad/MSX
        '.vec', '.gam', // Vectrex
        '.bin' // Generic
      ];
      
      // Find the first file with a valid ROM extension
      let romFile = null;
      for (const [filename, file] of Object.entries(zip.files)) {
        if (!file.dir) {
          const ext = '.' + filename.split('.').pop().toLowerCase();
          console.log(`Checking file in ZIP: ${filename}, extension: ${ext}`);
          if (allRomExtensions.includes(ext)) {
            const blob = await file.async('blob');
            romFile = new File([blob], filename, { type: 'application/octet-stream' });
            console.log(`Found ROM in ZIP: ${filename}`);
            break;
          }
        }
      }
      
      if (!romFile) {
        throw new Error('No valid ROM file found in ZIP archive');
      }
      
      return romFile;
    } catch (err) {
      console.error('Failed to extract ROM from ZIP:', err);
      throw err;
    }
  };

  // File input handler for ROM selection
  const onRomSelected = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    
    // Auto-detect console from file extension
    const detected = detectConsoleFromFile(f.name);
    console.log(`Auto-detected console: ${detected.core} for file: ${f.name}`);
    setCore(detected.core);
    setExtensions(detected.extensions);
    
    // Check if it's a ZIP file
    if (f.name.toLowerCase().endsWith('.zip')) {
      try {
        setStatus('loading');
        const romFile = await extractRomFromZip(f);
        // Re-detect from extracted ROM file
        const detectedFromRom = detectConsoleFromFile(romFile.name);
        console.log(`Auto-detected from ZIP contents: ${detectedFromRom.core}`);
        setCore(detectedFromRom.core);
        setExtensions(detectedFromRom.extensions);
        // Pass detected core directly to avoid async state issues
        await launchWithRomFile(romFile, detectedFromRom.core);
      } catch (err) {
        setErrorMessage('Failed to extract ROM from ZIP: ' + err.message);
        setStatus('error');
      }
    } else {
      // Pass detected core directly to avoid async state issues
      await launchWithRomFile(f, detected.core);
    }
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
      console.log(`Input event received: ${control} ${type} ${player}`);
      
      if (!nostalgistRef.current) {
        console.log('No nostalgist instance available');
        return;
      }
      
      // Try 1-based indexing: 1 = Player 1, 2 = Player 2
      const playerIndex = player === 'p2' ? 2 : 1;
      console.log(`Sending to emulator: ${control} (${type}) for player ${player} (index: ${playerIndex})`);
      
      try {
        // Try different methods to send player-specific input
        
        // Method 1: Try press with full payload including player
        if (typeof nostalgistRef.current.press === 'function') {
          console.log('Using press method with player payload');
          nostalgistRef.current.press({ 
            control, 
            type, 
            player: playerIndex 
          });
        }
        // Method 2: Try pressDown/pressUp with player index
        else if (type === 'down' && typeof nostalgistRef.current.pressDown === 'function') {
          console.log('Using pressDown method');
          nostalgistRef.current.pressDown(control, playerIndex);
        } else if (type === 'up' && typeof nostalgistRef.current.pressUp === 'function') {
          console.log('Using pressUp method');
          nostalgistRef.current.pressUp(control, playerIndex);
        }
        // Method 3: Try sendCommand
        else if (typeof nostalgistRef.current.sendCommand === 'function') {
          console.log('Using sendCommand method');
          nostalgistRef.current.sendCommand({ 
            type: 'input', 
            control, 
            action: type, 
            player: playerIndex 
          });
        } else {
          console.log('No input method available on nostalgist instance');
        }
      } catch (err) {
        console.error('Error sending input to emulator:', err);
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
    
    if (!n) {
      alert('Please load a ROM first');
      return;
    }
    
    if (typeof n.saveState !== 'function') {
      alert('Save state not supported by this core');
      return;
    }

    try {
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
      alert('State saved!');
    } catch (err) {
      console.error('Save state failed:', err);
      alert('Failed to save state: ' + err.message);
    }
  };

  // Load state: reads a .state file and passes it to Nostalgist.loadState()
  const onLoadStateFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    
    const n = nostalgistRef.current;
    if (!n) {
      alert('Please load a ROM first');
      return;
    }
    
    if (typeof n.loadState !== 'function') {
      alert('Load state not supported by this core');
      return;
    }

    try {
      // Try loading as a File object first (Nostalgist might accept File directly)
      try {
        await n.loadState(f);
        alert('State loaded!');
        return;
      } catch (fileErr) {
        // Fallback to ArrayBuffer
        const buffer = await f.arrayBuffer();
        await n.loadState(buffer);
        alert('State loaded!');
      }
    } catch (err) {
      console.error('Load state failed:', err);
      alert('Failed to load state: ' + err.message);
    }
  };

  // Auto-trigger ROM picker on first load if no ROM is loaded (desktop only)
  useEffect(() => {
    if (status === 'idle') {
      // Only auto-trigger on desktop, not mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (!isMobile) {
        const timer = setTimeout(() => {
          triggerRomPicker();
        }, 300);
        return () => clearTimeout(timer);
      }
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
  // Standard gamepad button mapping (based on standard gamepad layout)
  const GAMEPAD_MAPPING = {
    // Face buttons (Xbox: A=0, B=1, X=2, Y=3 | PlayStation: X=0, O=1, Square=2, Triangle=3)
    0: 'b',      // A/Cross -> SNES B
    1: 'a',      // B/Circle -> SNES A
    2: 'x',      // X/Square -> SNES X (swapped)
    3: 'y',      // Y/Triangle -> SNES Y (swapped)
    // Shoulder buttons
    4: 'l',      // LB/L1 -> SNES L
    5: 'r',      // RB/R1 -> SNES R
    6: 'l',      // LT/L2 -> SNES L (alternative)
    7: 'r',      // RT/R2 -> SNES R (alternative)
    // Center buttons
    8: 'select', // Select/Share
    9: 'start',  // Start/Options
    // D-pad (if available as buttons)
    12: 'up',
    13: 'down',
    14: 'left',
    15: 'right',
  };

  useEffect(() => {
    let intervalId = null;
    let hasGamepad = false;

    const checkGamepads = () => {
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      const connected = [];
      for (let i = 0; i < gps.length; i++) {
        if (gps[i]) {
          connected.push({ index: i, id: gps[i].id });
        }
      }
      hasGamepad = connected.length > 0;
      setConnectedGamepads(connected);
    };

    const pollGamepad = () => {
      if (!hasGamepad) return;
      // Only process gamepad input if emulator is running
      if (status === 'running' && !nostalgistRef.current) return;
      
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of gps) {
        if (!gp) continue;
        
        // Determine player (gamepad 0 = p1, gamepad 1 = p2)
        const player = gp.index === 0 ? 'p1' : 'p2';
        const playerNum = gp.index === 0 ? 1 : 2;
        
        // Initialize state for this gamepad if needed
        if (!gamepadState.current.buttons[gp.index]) {
          gamepadState.current.buttons[gp.index] = {};
        }
        if (!gamepadState.current.axes[gp.index]) {
          gamepadState.current.axes[gp.index] = { up: false, down: false, left: false, right: false };
        }
        
        // Process buttons
        gp.buttons.forEach((btn, idx) => {
          const snesButton = GAMEPAD_MAPPING[idx];
          if (!snesButton) return;
          
          const wasPressed = gamepadState.current.buttons[gp.index][idx];
          const isPressed = btn.pressed || btn.value > 0.5;
          
          // Only dispatch events on state change
          if (isPressed && !wasPressed) {
            // Button pressed
            console.log(`Gamepad ${gp.index} button pressed: ${snesButton} -> ${player} (playerNum: ${playerNum})`);
            window.dispatchEvent(new CustomEvent('snes:input', { 
              detail: { control: snesButton, type: 'down', player } 
            }));
            setActiveButtons((prev) => ({
              ...prev,
              [player]: { ...(prev[player] || {}), [snesButton]: true }
            }));
          } else if (!isPressed && wasPressed) {
            // Button released
            window.dispatchEvent(new CustomEvent('snes:input', { 
              detail: { control: snesButton, type: 'up', player } 
            }));
            setActiveButtons((prev) => ({
              ...prev,
              [player]: { ...(prev[player] || {}), [snesButton]: false }
            }));
          }
          
          gamepadState.current.buttons[gp.index][idx] = isPressed;
        });
        
        // Process analog sticks (left stick for D-pad)
        // axes[0] = left stick X, axes[1] = left stick Y
        const DEADZONE = 0.25;
        const axisX = gp.axes[0] || 0;
        const axisY = gp.axes[1] || 0;
        
        const axisState = gamepadState.current.axes[gp.index];
        
        // Left
        const leftActive = axisX < -DEADZONE;
        if (leftActive && !axisState.left) {
          window.dispatchEvent(new CustomEvent('snes:input', { 
            detail: { control: 'left', type: 'down', player } 
          }));
          setActiveButtons((prev) => ({
            ...prev,
            [player]: { ...(prev[player] || {}), left: true }
          }));
        } else if (!leftActive && axisState.left) {
          window.dispatchEvent(new CustomEvent('snes:input', { 
            detail: { control: 'left', type: 'up', player } 
          }));
          setActiveButtons((prev) => ({
            ...prev,
            [player]: { ...(prev[player] || {}), left: false }
          }));
        }
        axisState.left = leftActive;
        
        // Right
        const rightActive = axisX > DEADZONE;
        if (rightActive && !axisState.right) {
          window.dispatchEvent(new CustomEvent('snes:input', { 
            detail: { control: 'right', type: 'down', player } 
          }));
          setActiveButtons((prev) => ({
            ...prev,
            [player]: { ...(prev[player] || {}), right: true }
          }));
        } else if (!rightActive && axisState.right) {
          window.dispatchEvent(new CustomEvent('snes:input', { 
            detail: { control: 'right', type: 'up', player } 
          }));
          setActiveButtons((prev) => ({
            ...prev,
            [player]: { ...(prev[player] || {}), right: false }
          }));
        }
        axisState.right = rightActive;
        
        // Up
        const upActive = axisY < -DEADZONE;
        if (upActive && !axisState.up) {
          window.dispatchEvent(new CustomEvent('snes:input', { 
            detail: { control: 'up', type: 'down', player } 
          }));
          setActiveButtons((prev) => ({
            ...prev,
            [player]: { ...(prev[player] || {}), up: true }
          }));
        } else if (!upActive && axisState.up) {
          window.dispatchEvent(new CustomEvent('snes:input', { 
            detail: { control: 'up', type: 'up', player } 
          }));
          setActiveButtons((prev) => ({
            ...prev,
            [player]: { ...(prev[player] || {}), up: false }
          }));
        }
        axisState.up = upActive;
        
        // Down
        const downActive = axisY > DEADZONE;
        if (downActive && !axisState.down) {
          window.dispatchEvent(new CustomEvent('snes:input', { 
            detail: { control: 'down', type: 'down', player } 
          }));
          setActiveButtons((prev) => ({
            ...prev,
            [player]: { ...(prev[player] || {}), down: true }
          }));
        } else if (!downActive && axisState.down) {
          window.dispatchEvent(new CustomEvent('snes:input', { 
            detail: { control: 'down', type: 'up', player } 
          }));
          setActiveButtons((prev) => ({
            ...prev,
            [player]: { ...(prev[player] || {}), down: false }
          }));
        }
        axisState.down = downActive;
      }
    };

    // Check for gamepads on connect/disconnect
    const onGamepadConnected = (e) => {
      console.log('Gamepad connected:', e.gamepad.id);
      checkGamepads();
    };
    
    const onGamepadDisconnected = (e) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      checkGamepads();
    };
    
    window.addEventListener('gamepadconnected', onGamepadConnected);
    window.addEventListener('gamepaddisconnected', onGamepadDisconnected);
    checkGamepads();

    // Poll every 16ms (~60fps) only if gamepad is connected
    intervalId = setInterval(pollGamepad, 16);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('gamepadconnected', onGamepadConnected);
      window.removeEventListener('gamepaddisconnected', onGamepadDisconnected);
    };
  }, [status]); // Re-run when status changes to ensure gamepad works when emulator starts

  // Pointer/touch handlers for on-screen controls
  const handleVirtualPress = (buttonName, player = 'p1') => {
    // visual feedback
    setActiveButtons((prev) => ({
      ...prev,
      [player]: { ...(prev[player] || {}), [buttonName]: true }
    }));
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
                        Retro Emulator
                      </div>
                      <div className="text-[#9afbd8]/70 text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                        Load any ROM file to start
                      </div>
                      <div className="text-[#9afbd8]/50 text-[10px] mt-2" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                        Supports SNES, NES, GBA, Genesis & more
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Power LED indicator */}
          {status === 'running' && <div className="power-led" title="Power On"></div>}

          {/* Control buttons below TV screen */}
          <div className="tv-buttons">
            <button className="tv-button" onClick={() => { playSound('/UI SELECT.wav'); triggerRomPicker(); }} title="Load ROM">
              <span style={{ fontSize: '14px' }}>⏏</span>
              <div style={{ fontSize: '6px', marginTop: '2px' }}>LOAD</div>
            </button>
            <button className="tv-button" onClick={() => { playSound('/UI SELECT.wav'); toggleFullscreen(); }} title="Fullscreen">
              <span style={{ fontSize: '14px' }}>⛶</span>
              <div style={{ fontSize: '6px', marginTop: '2px' }}>FULL</div>
            </button>
            <button className="tv-button" onClick={() => { playSound('/UI SELECT.wav'); saveState(); }} title="Save State">
              <span style={{ fontSize: '14px' }}>💾</span>
              <div style={{ fontSize: '6px', marginTop: '2px' }}>SAVE</div>
            </button>
            <button className="tv-button" onClick={() => { playSound('/UI SELECT.wav'); loadStateInputRef.current && loadStateInputRef.current.click(); }} title="Load State">
              <span style={{ fontSize: '14px' }}>📂</span>
              <div style={{ fontSize: '6px', marginTop: '2px' }}>LOAD</div>
            </button>
          </div>

          {/* Controller panel below the TV */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 0 }}>
            <div className="controller-area" aria-hidden>

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
                  <div className={`dpad-zone up ${(activeButtons.p1?.up || activeButtons.p2?.up) ? 'pressed' : ''}`} />
                  <div className={`dpad-zone down ${(activeButtons.p1?.down || activeButtons.p2?.down) ? 'pressed' : ''}`} />
                  <div className={`dpad-zone left ${(activeButtons.p1?.left || activeButtons.p2?.left) ? 'pressed' : ''}`} />
                  <div className={`dpad-zone right ${(activeButtons.p1?.right || activeButtons.p2?.right) ? 'pressed' : ''}`} />
                </div>

                {/* Center buttons (Start/Select) with label */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div className="center-buttons">
                    <div
                      className={`center-button select ${(activeButtons.p1?.select || activeButtons.p2?.select) ? 'pressed' : ''}`}
                      onPointerDown={() => { playSound('/UI SELECT.wav'); handleVirtualPress('select'); }}
                      onPointerUp={() => handleVirtualRelease('select')}
                      onTouchStart={() => { playSound('/UI SELECT.wav'); handleVirtualPress('select'); }}
                      onTouchEnd={() => handleVirtualRelease('select')}
                    ></div>
                    <div
                      className={`center-button start ${(activeButtons.p1?.start || activeButtons.p2?.start) ? 'pressed' : ''}`}
                      onPointerDown={() => { playSound('/UI START.wav'); handleVirtualPress('start'); }}
                      onPointerUp={() => handleVirtualRelease('start')}
                      onTouchStart={() => { playSound('/UI START.wav'); handleVirtualPress('start'); }}
                      onTouchEnd={() => handleVirtualRelease('start')}
                    ></div>
                  </div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '9px', color: '#888', letterSpacing: '2px' }}>
                    START SELCT
                  </div>
                </div>

                <div className="face-buttons">
              <div
                className={`face-button y ${(activeButtons.p1?.y || activeButtons.p2?.y) ? 'pressed' : ''}`}
                onPointerDown={() => handleVirtualPress('y')}
                onPointerUp={() => handleVirtualRelease('y')}
                onTouchStart={() => handleVirtualPress('y')}
                onTouchEnd={() => handleVirtualRelease('y')}
              ></div>
              <div
                className={`face-button x ${(activeButtons.p1?.x || activeButtons.p2?.x) ? 'pressed' : ''}`}
                onPointerDown={() => handleVirtualPress('x')}
                onPointerUp={() => handleVirtualRelease('x')}
                onTouchStart={() => handleVirtualPress('x')}
                onTouchEnd={() => handleVirtualRelease('x')}
              ></div>
              <div
                className={`face-button a ${(activeButtons.p1?.a || activeButtons.p2?.a) ? 'pressed' : ''}`}
                onPointerDown={() => handleVirtualPress('a')}
                onPointerUp={() => handleVirtualRelease('a')}
                onTouchStart={() => handleVirtualPress('a')}
                onTouchEnd={() => handleVirtualRelease('a')}
              ></div>
              <div
                className={`face-button b ${(activeButtons.p1?.b || activeButtons.p2?.b) ? 'pressed' : ''}`}
                onPointerDown={() => handleVirtualPress('b')}
                onPointerUp={() => handleVirtualRelease('b')}
                onTouchStart={() => handleVirtualPress('b')}
                onTouchEnd={() => handleVirtualRelease('b')}
              ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden inputs */}
        <input ref={romInputRef} type="file" accept=".smc,.sfc,.fig,.swc,.nes,.unf,.unif,.gba,.agb,.gbc,.gb,.n64,.z64,.v64,.nds,.md,.gen,.smd,.sms,.gg,.cue,.chd,.iso,.32x,.ccd,.pbp,.a26,.a78,.lnx,.o,.j64,.jag,.pce,.sgx,.ngp,.ngc,.ws,.wsc,.vb,.vboy,.rom,.mx1,.mx2,.dsk,.d64,.t64,.prg,.cdt,.vec,.gam,.bin,.zip,application/octet-stream,application/zip" className="hidden" onChange={onRomSelected} />
        <input ref={loadStateInputRef} type="file" accept=".state,application/octet-stream" className="hidden" onChange={onLoadStateFile} />

        {/* Mobile-friendly load ROM button (only shows when no ROM is loaded) */}
        {status === 'idle' && (
          <button className="mobile-load-rom" onClick={triggerRomPicker}>
            📁 LOAD ROM
          </button>
        )}

        <div className="status-text mt-3 text-xs text-[#9afbd8]/80">
          <div>
            Status: {status}
            {status === 'idle' && <span className="ml-2">(Load any ROM to auto-detect console)</span>}
          </div>
          {connectedGamepads.length > 0 && (
            <div className="mt-1">
              🎮 {connectedGamepads.length} controller{connectedGamepads.length > 1 ? 's' : ''} connected
            </div>
          )}
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
    </div>
  );
}


