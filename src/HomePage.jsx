import React from "react";

/*
  HomePage.jsx
  - Retro SNES-inspired homepage component using React + Tailwind CSS
  - Visual features included: dark CRT-like background, pixel font (Press Start 2P),
    scanline overlay, vignette/CRT glow, and a big neon "Load ROM" button.
  - NOTE: This component only builds the UI; emulator logic / file handling is
    intentionally omitted and should be added where the EmulatorScreen component
    is integrated.
*/

export default function HomePage({ onStart }) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden crt-root"
    >

      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#071018] via-[#00121a] to-[#000000]" />

      <div className="absolute inset-0 pointer-events-none -z-10 vignette" />

      <div className="absolute inset-0 pointer-events-none -z-5 scanlines" />

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
        <div className="mb-8 select-none">
          <h1 className="text-[22px] sm:text-4xl md:text-5xl neon-title">
            SNES Retro Hub
          </h1>

          <p className="mt-3 text-xs text-[#9afbd8]/80 max-w-xl">
            An SNES ROMs player.
          </p>
        </div>

        <button
          type="button"
          aria-label="Load ROM"
          className="transform transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none neon-button"
          onClick={() => {
            // If the parent provided an onStart callback, use it to navigate to emulator screen
            if (typeof onStart === 'function') onStart();
            else window.dispatchEvent(new CustomEvent('snes:request-open-file'));
          }}
        >
          <span className="uppercase text-[13px]">START</span>
        </button>

        <div className="mt-6 text-[11px] text-[#a9fbe1]/70 select-none">
          Click to load a ROM file (emulator built in)
        </div>
      </div>

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


