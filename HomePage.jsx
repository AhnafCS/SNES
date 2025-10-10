import React from "react";

/*
  HomePage.jsx
  - Retro SNES-inspired homepage component using React + Tailwind CSS
  - Visual features included: dark CRT-like background, pixel font (Press Start 2P),
    scanline overlay, vignette/CRT glow, and a big neon "Load ROM" button.
  - NOTE: This component only builds the UI; emulator logic / file handling is
    intentionally omitted and should be added later where indicated.
*/

export default function HomePage() {
  return (
    <div
      // Root: full-screen container that positions all visual layers
      className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden"
      // Inline font-family references the pixel font; ensure you add the
      // Google Fonts link for "Press Start 2P" in your `index.html` or
      // import it globally in your CSS so the pixel font is available.
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >

      {/* Background gradient layer to emulate deep CRT colors */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#071018] via-[#00121a] to-[#000000]" />

      {/* CRT vignette / soft glow to darken corners and add depth */}
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(20,255,200,0.03) 0%, rgba(0,0,0,0.65) 60%)',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Subtle scanline overlay: repeating 1px lines to imitate CRT scanlines */}
      <div
        className="absolute inset-0 pointer-events-none -z-5"
        style={{
          backgroundImage:
            'repeating-linear-gradient( to bottom, rgba(255,255,255,0.02) 0px, rgba(0,0,0,0.02) 1px )',
          opacity: 0.18,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Main content: sits above decorative layers */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">

        {/* Title / Logo area */}
        <div className="mb-8 select-none">
          {/* Large pixel-styled title. Use color with soft neon glow via text-shadow */}
          <h1
            className="text-[22px] sm:text-4xl md:text-5xl text-[#8effd6]"
            style={{
              // textShadow provides the neon glow; Tailwind doesn't include text-shadow utilities by default
              textShadow: '0 0 18px rgba(102,255,204,0.95), 0 0 6px rgba(0,0,0,0.6)',
              letterSpacing: '0.06em',
            }}
          >
            SNES Retro Hub
          </h1>

          {/* Small subtitle for atmosphere */}
          <p className="mt-3 text-xs text-[#9afbd8]/80 max-w-xl">
            A retro-styled frontend for loading SNES ROMs — UI only, emulator logic coming later.
          </p>
        </div>

        {/* Neon "Load ROM" button */}
        <button
          type="button"
          aria-label="Load ROM"
          className="transform transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none"
          style={{
            // Large rounded rectangle with neon gradient and glowing shadow
            background: 'linear-gradient(90deg, rgba(0,255,200,0.12), rgba(0,180,255,0.06))',
            border: '2px solid rgba(0,255,200,0.28)',
            padding: '18px 44px',
            borderRadius: '10px',
            color: '#e8fff7',
            fontSize: 14,
            // strong neon glow
            boxShadow: '0 6px 30px rgba(0,255,200,0.14), inset 0 0 18px rgba(0,255,200,0.04)',
            // text glow to match the neon look
            textShadow: '0 0 14px rgba(102,255,204,0.95), 0 0 6px rgba(0,0,0,0.6)',
            // pixel-feel letter spacing
            letterSpacing: '0.07em',
            // keep the pixel font feel
            fontFamily: "'Press Start 2P', monospace",
          }}
          onClick={() => {
            // Placeholder click handler. Replace with file-picker / emulator logic later.
            // Intentionally minimal to avoid adding emulator dependencies now.
            console.log('Load ROM clicked');
          }}
        >
          {/* Button label intentionally uppercased to evoke arcade feel */}
          <span className="uppercase text-[13px]">Load ROM</span>
        </button>

        {/* Footer hint - small and unobtrusive */}
        <div className="mt-6 text-[11px] text-[#a9fbe1]/70 select-none">
          Click to load a ROM file (emulator not attached in this UI build)
        </div>
      </div>

      {/* Optional decorative scanline flicker element (purely visual) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-1 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(0,0,0,0.01) 50%, rgba(255,255,255,0.01) 100%)',
          opacity: 0.02,
        }}
      />
    </div>
  );
}


