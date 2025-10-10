import React, { useEffect, useRef, useState } from "react";

/*
  EmulatorScreen.jsx
  - Renders a 256x224 <canvas> element (classic SNES resolution) inside a
    styled CRT frame using Tailwind CSS and inline styles for effects that
    Tailwind does not provide by default (e.g., subtle curvature/glow).
  - Visual features:
    * Slight screen curvature via CSS transform + pseudo 3D shading
    * Glow border around the screen to emulate CRT bezel
    * Scanline overlay drawn on a stacked element above the canvas
    * Placeholder centered text: "Insert ROM to start"
  - Includes a hidden file input accepting .smc/.sfc files and stores the
    uploaded ROM bytes as a Uint8Array in `romData` for future emulator use.
*/

export default function EmulatorScreen({ className = "", style = {} }) {
  const canvasRef = useRef(null);
  // romData will hold the uploaded ROM file bytes as a Uint8Array (or null)
  // This is where emulator integration will later read ROM data from.
  const [romData, setRomData] = useState(null);
  // A ref to the hidden file input so we can trigger it from a custom button
  const fileInputRef = useRef(null);
  // Reference to the loaded emulator module (Emscripten or custom wrapper)
  const emuRef = useRef(null);
  // RAF id for the render/emulation loop
  const rafRef = useRef(null);

  /**
   * handleFileChange
   * - Called when the user selects a file from the file input.
   * - Reads the file as an ArrayBuffer and stores a Uint8Array in `romData`.
   * - Accepts .smc and .sfc files (common SNES ROM extensions).
   */
  const handleFileChange = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    // Basic client-side validation: check file extension
    const name = file.name.toLowerCase();
    if (!name.endsWith('.smc') && !name.endsWith('.sfc')) {
      // You could show a UI message here; for now we log and ignore the file
      console.warn('Unsupported file type. Please select a .smc or .sfc ROM.');
      return;
    }

    try {
      // Read the file as an ArrayBuffer (binary data)
      const arrayBuffer = await file.arrayBuffer();

      // Convert to a Uint8Array for easier binary manipulation later
      const bytes = new Uint8Array(arrayBuffer);

      // Store ROM bytes in state variable `romData` for later emulator use
      setRomData(bytes);

      // For debugging: log the file name and size (in bytes)
      console.log('Loaded ROM:', file.name, 'size:', bytes.length);
      // After loading ROM bytes, initialize emulator and load the ROM into it.
      try {
        const emu = await initEmulator();

        // Different builds might provide different APIs for loading ROM data.
        // We attempt common patterns here and log warnings if none match.
        if (emu && typeof emu.loadROM === 'function') {
          // Some custom wrappers expose loadROM(Uint8Array)
          emu.loadROM(bytes);
        } else if (emu && typeof emu._load_rom === 'function') {
          // Emscripten C function - allocate memory and call it via ccall
          try {
            // allocate memory in wasm heap and copy bytes
            const ptr = emu._malloc(bytes.length);
            emu.HEAPU8.set(bytes, ptr);
            // Call C function: load_rom(ptr, size)
            if (typeof emu.ccall === 'function') {
              emu.ccall('load_rom', 'number', ['number', 'number'], [ptr, bytes.length]);
            } else if (typeof emu._load_rom === 'function') {
              emu._load_rom(ptr, bytes.length);
            }
            // free memory after use
            emu._free(ptr);
          } catch (e) {
            console.warn('ROM loading via _load_rom failed', e);
          }
        } else if (emu && typeof emu.ccall === 'function') {
          // Try to call a guessed symbol name via ccall
          try {
            // Some builds might expose a convenience function to load via JS
            // This is a best-effort attempt and may be no-op.
            emu.ccall('js_load_rom', 'number', ['array', 'number'], [bytes, bytes.length]);
          } catch (e) {
            console.warn('ccall-based ROM load attempt failed', e);
          }
        } else {
          console.warn('Unable to find a supported ROM-loading API on the emulator module.');
        }

        // Start the rendering/emulation loop
        startEmulationLoop();
      } catch (err) {
        console.error('Error initializing emulator after ROM load:', err);
      }
    } catch (err) {
      console.error('Failed to read ROM file:', err);
    }
  };

  // Convenience to open the native file picker from a custom UI element
  const triggerFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  /**
   * initEmulator
   * - Dynamically imports the emulator JS wrapper located at /emulator/snes9x.js
   * - Fetches the WASM binary at /emulator/snes9x.wasm and passes it into the
   *   module factory so the WebAssembly is instantiated with the expected binary.
   * - Provides the canvas element so many Emscripten builds can render directly
   *   to the provided canvas (via Module['canvas']) without extra copying.
   *
   * NOTE: Different Snes9x builds expose different APIs. This initializer is
   * written defensively and attempts several common integration points. You may
   * need to adapt function names (e.g., `loadROM`, `emulateFrame`, or exported
   * C functions via `ccall`) depending on the exact build you have.
   */
  const initEmulator = async () => {
    if (emuRef.current) return emuRef.current;

    try {
      // Dynamically import the JS glue code. It may export a default factory
      // function (Emscripten style) or several named exports.
      const moduleNamespace = await import('/emulator/snes9x.js');
      const ModuleFactory = moduleNamespace.default || moduleNamespace;

      // Fetch the wasm binary to pass as `wasmBinary` into the ModuleFactory.
      const wasmResp = await fetch('/emulator/snes9x.wasm');
      const wasmBinary = await wasmResp.arrayBuffer();

      // Create the module instance and provide the canvas so the module can
      // render directly to it if it supports that mode.
      const moduleInstance = await ModuleFactory({
        wasmBinary,
        canvas: canvasRef.current,
        // locateFile can help the loader resolve the wasm path if needed.
        locateFile: (path) => (path === 'snes9x.wasm' ? '/emulator/snes9x.wasm' : path),
      });

      emuRef.current = moduleInstance;
      console.log('Snes9x module initialized', emuRef.current);
      return moduleInstance;
    } catch (err) {
      console.error('Failed to initialize emulator module:', err);
      throw err;
    }
  };

  /**
   * startEmulationLoop
   * - Starts a requestAnimationFrame loop that advances the emulator and
   *   allows frames to be rendered to the canvas. The exact method used to
   *   advance the emulator depends on the exposed API; we attempt common
   *   methods (`emulateFrame`, `_emulate_frame`, `ccall('emulate_frame')`).
   */
  const startEmulationLoop = () => {
    if (!emuRef.current) return;

    const step = () => {
      const m = emuRef.current;

      // Try a few common function names - adapt to your binary's API if needed
      if (typeof m.emulateFrame === 'function') {
        m.emulateFrame();
      } else if (typeof m._emulate_frame === 'function') {
        // Emscripten-exposed C function
        try {
          m._emulate_frame();
        } catch (e) {
          // ignore
        }
      } else if (typeof m.ccall === 'function') {
        // Some builds expose a ccall wrapper to call C functions by name
        try {
          // common C symbol guess - replace with actual symbol name if different
          m.ccall('emulate_frame', 'number', [], []);
        } catch (e) {
          // ignore
        }
      } else {
        // If none of the above exist, we expect the module to render on its own
        // (e.g., via its internal main loop). In that case we do nothing here.
      }

      rafRef.current = requestAnimationFrame(step);
    };

    if (!rafRef.current) rafRef.current = requestAnimationFrame(step);
  };

  const stopEmulationLoop = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // Listen for a global request event (dispatched by HomePage) to trigger
  // the file picker. This decouples the two components without a global store.
  useEffect(() => {
    const onRequest = () => triggerFilePicker();
    window.addEventListener('snes:request-open-file', onRequest);
    return () => window.removeEventListener('snes:request-open-file', onRequest);
  }, []);

  // On mount we set the canvas physical size to the SNES resolution and apply
  // a nearest-neighbor pixel-upscaling by setting CSS width/height while
  // keeping the internal canvas resolution to 256x224. This avoids anti-aliasing.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // SNES internal resolution
    const width = 256;
    const height = 224;

    // Set internal pixel size
    canvas.width = width;
    canvas.height = height;

    // Upscaled CSS size for display (adjust scale as desired)
    const scale = 2.5; // 256x2.5 = 640px width (crisp integer scaling not required)
    canvas.style.width = `${Math.round(width * scale)}px`;
    canvas.style.height = `${Math.round(height * scale)}px`;

    const ctx = canvas.getContext("2d");
    // Use nearest neighbor scaling to keep pixel art sharp
    ctx.imageSmoothingEnabled = false;

    // Draw placeholder background and text on the canvas
    ctx.fillStyle = "#031018"; // deep bluish-black
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#bfffe8";
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("Insert ROM to start", width / 2, height / 2 - 6);

    // If the emulator module was already initialized and a ROM was previously
    // loaded into `romData`, we could re-load it here. For now, emulation
    // starts when a ROM is chosen and `handleFileChange` calls initEmulator().
  }, []);

  return (
    <div className={`flex items-center justify-center p-6 ${className}`} style={style}>
      {/* Bezel / frame */}
      <div
        className="crt-bezel"
      >
        {/* Curved screen container: we use a subtle transform and an inner shadow */}
        <div className="crt-screen rounded-lg overflow-hidden relative">
          <canvas ref={canvasRef} className="canvas-style block mx-auto" />

          {/* Hidden file input for ROM upload; accepts common SNES ROM extensions */}
          <input ref={fileInputRef} type="file" accept=".smc,.sfc,application/octet-stream" className="hidden" onChange={handleFileChange} />

          {/* If romData is null we show an overlay button to trigger the file picker */}
          {!romData && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFilePicker();
                }}
                className="pointer-events-auto bg-transparent border border-transparent px-4 py-2 rounded-md"
                style={{
                  color: '#bfffe8',
                  fontFamily: "'Press Start 2P', monospace",
                  textShadow: '0 0 8px rgba(102,255,204,0.8)',
                }}
              >
                <span className="text-[11px]">Insert ROM</span>
              </button>
            </div>
          )}

          {/* Scanline overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              mixBlendMode: 'overlay',
              backgroundImage:
                'repeating-linear-gradient( to bottom, rgba(255,255,255,0.02) 0px, rgba(0,0,0,0.02) 1px )',
              opacity: 0.12,
            }}
          />
        </div>
      </div>
    </div>
  );
}


