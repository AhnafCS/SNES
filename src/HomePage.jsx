import React, { useState, useEffect } from "react";

export default function HomePage({ onStart, onShowConsoles }) {
  const [blinking, setBlinking] = useState(true);

  // Blink "Press Start" text
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinking(prev => !prev);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Handle Enter key or Space key to start
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onStart]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0520] via-[#050210] to-[#000000]" />
      
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none scanlines" />
      
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none vignette" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-3xl">
        {/* Title */}
        <h1 
          className="text-5xl sm:text-6xl md:text-7xl mb-12 select-none"
          style={{ 
            fontFamily: "'Press Start 2P', monospace",
            color: '#8effd6',
            textShadow: '0 0 20px rgba(102,255,204,0.8), 0 0 40px rgba(102,255,204,0.4)',
            letterSpacing: '0.1em'
          }}
        >
          RETRO ARCADE
        </h1>

        {/* Description */}
        <div className="mb-16 space-y-6">
          <p 
            className="text-base sm:text-lg md:text-xl text-[#9afbd8]/90 leading-relaxed"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            Play classic games from<br />
            <button
              onClick={onShowConsoles}
              className="group inline-block cursor-pointer"
              style={{ 
                fontFamily: "'Press Start 2P', monospace",
                background: 'none',
                border: '2px dashed rgba(154, 251, 216, 0.4)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: 'inherit',
                color: 'inherit',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffff00';
                e.currentTarget.style.textShadow = '0 0 10px rgba(255,255,0,0.8), 0 0 20px rgba(255,255,0,0.5)';
                e.currentTarget.style.borderColor = 'rgba(255,255,0,0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'inherit';
                e.currentTarget.style.textShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(154, 251, 216, 0.4)';
              }}
            >
              30+ retro consoles
            </button><br />
            Auto-detected from ROM
          </p>
          
          <p 
            className="text-sm sm:text-base md:text-lg text-[#66ffcc]/70 mt-8"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            🎮 Controller recommended<br />
            for the best experience
          </p>
        </div>

        {/* Press Start Button */}
        <button
          onClick={onStart}
          className="group relative"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '2rem',
            color: blinking ? '#ffff00' : 'transparent',
            textShadow: blinking ? '0 0 15px rgba(255,255,0,0.9), 0 0 30px rgba(255,255,0,0.6)' : 'none',
            transition: 'all 0.3s ease',
            padding: '1.5rem 3rem',
            letterSpacing: '0.15em'
          }}
        >
          PRESS START
        </button>

        {/* Hint text */}
        <p 
          className="mt-12 text-xs text-[#66ffcc]/40"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          Press ENTER or SPACE
        </p>
      </div>
    </div>
  );
}
