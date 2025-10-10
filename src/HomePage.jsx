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
  const consoles = [
    // Nintendo Consoles (tested & working)
    { id: 'snes', name: 'Super Nintendo', core: 'snes9x', extensions: '.smc,.sfc', color: '#9945FF' },
    { id: 'nes', name: 'Nintendo (NES)', core: 'fceumm', extensions: '.nes', color: '#E60012' },
    { id: 'gba', name: 'Game Boy Advance', core: 'mgba', extensions: '.gba', color: '#8B4789' },
    { id: 'gbc', name: 'Game Boy Color', core: 'gambatte', extensions: '.gbc', color: '#FFD700' },
    { id: 'gb', name: 'Game Boy', core: 'gambatte', extensions: '.gb', color: '#9BBC0F' },
    
    // Sega Consoles (tested & working)
    { id: 'genesis', name: 'Sega Genesis', core: 'genesis_plus_gx', extensions: '.md,.gen,.bin', color: '#0089CF' },
    { id: 'sms', name: 'Sega Master System', core: 'genesis_plus_gx', extensions: '.sms', color: '#2196F3' },
    { id: 'gg', name: 'Sega Game Gear', core: 'genesis_plus_gx', extensions: '.gg', color: '#00BCD4' },
    { id: 'segacd', name: 'Sega CD', core: 'genesis_plus_gx', extensions: '.cue,.bin,.iso', color: '#009688' },
    { id: '32x', name: 'Sega 32X', core: 'picodrive', extensions: '.32x,.bin', color: '#4CAF50' },
    
    // Atari Consoles (tested & working)
    { id: 'a2600', name: 'Atari 2600', core: 'stella', extensions: '.a26,.bin', color: '#D32F2F' },
    { id: 'a7800', name: 'Atari 7800', core: 'prosystem', extensions: '.a78', color: '#E91E63' },
    { id: 'lynx', name: 'Atari Lynx', core: 'handy', extensions: '.lnx', color: '#FF5722' },
    
    // Other Consoles (tested & working)
    { id: 'pce', name: 'PC Engine', core: 'mednafen_pce_fast', extensions: '.pce', color: '#FF8C00' },
    { id: 'ngp', name: 'Neo Geo Pocket', core: 'mednafen_ngp', extensions: '.ngp,.ngc', color: '#4A90E2' },
    { id: 'ws', name: 'WonderSwan', core: 'mednafen_wswan', extensions: '.ws,.wsc', color: '#9C27B0' },
    { id: 'vb', name: 'Virtual Boy', core: 'mednafen_vb', extensions: '.vb', color: '#E53935' },
  ];

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden crt-root"
    >

      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#071018] via-[#00121a] to-[#000000]" />

      <div className="absolute inset-0 pointer-events-none -z-10 vignette" />

      <div className="absolute inset-0 pointer-events-none -z-5 scanlines" />

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto">
        <div className="mb-8 select-none">
          <h1 className="text-[22px] sm:text-4xl md:text-5xl neon-title">
            Retro Emulator Hub
          </h1>

          <p className="mt-3 text-xs text-[#9afbd8]/80 max-w-xl">
            Play classic games from multiple retro consoles
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full max-w-5xl mb-6">
          {consoles.map((console) => (
            <button
              key={console.id}
              type="button"
              className="console-card transform transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none"
              style={{
                '--console-color': console.color,
              }}
              onClick={() => {
                if (typeof onStart === 'function') onStart(console.core, console.extensions);
              }}
            >
              <div className="console-name">{console.name}</div>
            </button>
          ))}
        </div>

        <div className="mt-4 text-[10px] text-[#a9fbe1]/60 select-none">
          Select a console to load a ROM file (ZIP files supported)
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


