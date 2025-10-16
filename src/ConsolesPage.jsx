import React from "react";

export default function ConsolesPage({ onBack }) {
  const consoles = [
    { name: "Super Nintendo (SNES)", extensions: ".smc, .sfc, .fig, .swc" },
    { name: "Nintendo Entertainment System (NES)", extensions: ".nes, .unf, .unif" },
    { name: "Nintendo 64", extensions: ".n64, .z64, .v64" },
    { name: "Nintendo DS", extensions: ".nds" },
    { name: "Game Boy Advance", extensions: ".gba, .agb" },
    { name: "Game Boy Color", extensions: ".gbc" },
    { name: "Game Boy", extensions: ".gb" },
    { name: "Sega Genesis / Mega Drive", extensions: ".md, .gen, .smd" },
    { name: "Sega Master System", extensions: ".sms" },
    { name: "Sega Game Gear", extensions: ".gg" },
    { name: "Sega CD", extensions: ".cue, .chd, .iso" },
    { name: "Sega 32X", extensions: ".32x" },
    { name: "Sega Saturn", extensions: ".cue, .ccd, .chd" },
    { name: "Sony PlayStation", extensions: ".cue, .chd, .pbp" },
    { name: "Atari 2600", extensions: ".a26" },
    { name: "Atari 7800", extensions: ".a78" },
    { name: "Atari Lynx", extensions: ".lnx, .o" },
    { name: "Atari Jaguar", extensions: ".j64, .jag" },
    { name: "PC Engine / TurboGrafx-16", extensions: ".pce, .sgx" },
    { name: "Neo Geo Pocket", extensions: ".ngp, .ngc" },
    { name: "WonderSwan", extensions: ".ws, .wsc" },
    { name: "Virtual Boy", extensions: ".vb, .vboy" },
    { name: "MSX", extensions: ".rom, .mx1, .mx2, .dsk" },
    { name: "Commodore 64", extensions: ".d64, .t64, .prg" },
    { name: "Amstrad CPC", extensions: ".cdt, .dsk" },
    { name: "3DO", extensions: ".iso, .cue, .chd" },
    { name: "Vectrex", extensions: ".vec, .gam" },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col bg-black relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0520] via-[#050210] to-[#000000]" />
      
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none scanlines" />
      
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none vignette" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 py-8 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between w-full mb-8">
          <button
            onClick={onBack}
            className="text-[#66ffcc] hover:text-[#8effd6] transition-colors"
            style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '12px' }}
          >
            ← BACK
          </button>
          <h1 
            className="text-2xl sm:text-3xl md:text-4xl select-none"
            style={{ 
              fontFamily: "'Press Start 2P', monospace",
              color: '#8effd6',
              textShadow: '0 0 20px rgba(102,255,204,0.8)',
              letterSpacing: '0.1em'
            }}
          >
            SUPPORTED CONSOLES
          </h1>
          <div style={{ width: '80px' }} /> {/* Spacer for centering */}
        </div>

        {/* Console List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {consoles.map((console, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-[#1a1a2e]/80 to-[#0f0f1e]/80 border-2 border-[#66ffcc]/30 rounded-lg p-4 hover:border-[#8effd6]/60 transition-all duration-300"
              style={{
                boxShadow: '0 4px 15px rgba(102,255,204,0.1)',
              }}
            >
              <h3 
                className="text-sm sm:text-base text-[#8effd6] mb-2"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                {console.name}
              </h3>
              <p 
                className="text-xs text-[#66ffcc]/70"
                style={{ fontFamily: "'Press Start 2P', monospace", lineHeight: '1.6' }}
              >
                {console.extensions}
              </p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p 
          className="mt-8 text-xs text-[#66ffcc]/50 text-center max-w-2xl"
          style={{ fontFamily: "'Press Start 2P', monospace", lineHeight: '1.8' }}
        >
          Simply load any ROM file and the console will be auto-detected from the file extension. ZIP files are supported!
        </p>
      </div>
    </div>
  );
}
