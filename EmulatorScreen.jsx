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
  - NOTE: No emulator logic is integrated here. This component only handles
    the visual container and exposes the canvas via a ref for future use.
*/

export default function EmulatorScreen({ className = "", style = {} }) {
  const canvasRef = useRef(null);
  // romData will hold the uploaded ROM file bytes as a Uint8Array (or null)
  // This is where emulator integration will later read ROM data from.
  const [romData, setRomData] = useState(null);
  // A ref to the hidden file input so we can trigger it from a custom button
  const fileInputRef = useRef(null);

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
    } catch (err) {
      console.error('Failed to read ROM file:', err);
    }
  };

  // Convenience to open the native file picker from a custom UI element
  const triggerFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

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
  }, []);

  return (
    <div
      // Outer container centers the CRT and applies a bezel/glow
      className={`flex items-center justify-center p-6 ${className}`}
      style={style}
    >
      {/* Bezel / frame */}
      <div
        className="relative rounded-xl"
        style={{
          // Outer glow and subtle glassy gradient to suggest a CRT bezel
          boxShadow: '0 20px 60px rgba(0, 200, 170, 0.07), 0 6px 20px rgba(0,0,0,0.6)',
          background: 'linear-gradient(180deg, rgba(8,20,24,0.9), rgba(2,6,8,0.85))',
          padding: '14px',
        }}
      >
        {/* Curved screen container: we use a subtle transform and an inner shadow */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            borderRadius: 12,
            // Inner glow border
            boxShadow:
              'inset 0 0 30px rgba(0,255,200,0.03), inset 0 -10px 40px rgba(0,0,0,0.6)',
            // Slight perspective/curvature using transform; purely visual
            transform: 'perspective(800px) rotateX(1.5deg)',
            WebkitTransform: 'perspective(800px) rotateX(1.5deg)',
          }}
        >
          {/* Canvas element: 256x224 internal resolution, upscaled via CSS */}
          <canvas
            ref={canvasRef}
            className="block mx-auto"
            // Inline style used to force crisp nearest-neighbor rendering when scaled
            style={{
              imageRendering: 'pixelated',
              display: 'block',
              // Slight rounded corners to blend with bezel
              borderRadius: 8,
            }}
          />

          {/* Hidden file input for ROM upload; accepts common SNES ROM extensions */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".smc,.sfc,application/octet-stream"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* If romData is null we show an overlay button to trigger the file picker */}
          {!romData && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <button
                type="button"
                onClick={(e) => {
                  // allow the button to receive pointer events and trigger the file picker
                  e.stopPropagation();
                  triggerFilePicker();
                }}
                className="pointer-events-auto bg-transparent border border-transparent px-4 py-2 rounded-md"
                style={{
                  // Ensure the visual cue is subtle; the actual canvas still displays placeholder text
                  color: '#bfffe8',
                  fontFamily: "'Press Start 2P', monospace",
                  textShadow: '0 0 8px rgba(102,255,204,0.8)',
                }}
              >
                {/* This button is visually subtle but clickable to open file picker */}
                <span className="text-[11px]">Insert ROM</span>
              </button>
            </div>
          )}

          {/* Scanline overlay: positioned absolute in the parent and uses a
              repeating-linear-gradient to emulate thin CRT scanlines */}
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


