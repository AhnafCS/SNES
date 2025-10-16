import React, { useState } from 'react';
import EmulatorScreen1P from './EmulatorScreen(fixes all)';
import EmulatorScreen2P from './EmulatorScreen';

/*
  EmulatorScreenWrapper.jsx
  - Wrapper component that switches between two different EmulatorScreen implementations
  - 1P Mode: Uses EmulatorScreen(fixes all).jsx where gamepad = P1
  - 2P Mode: Uses the version where keyboard = P1, gamepad = P2
  - Switching modes will refresh the emulator
*/

export default function EmulatorScreenWrapper({ core = 'snes9x', extensions = '.smc,.sfc' }) {
  const [controlMode, setControlMode] = useState('1P'); // '1P' or '2P'
  const [key, setKey] = useState(0); // Force remount when switching

  const handleModeSwitch = (newMode) => {
    setControlMode(newMode);
    setKey(prev => prev + 1); // Force component remount
  };

  // Sound effect for mode switch
  const playSound = (soundFile) => {
    try {
      const audio = new Audio(soundFile);
      audio.volume = 0.3;
      audio.play().catch(e => console.debug('Could not play sound:', soundFile, e));
    } catch (e) {
      console.debug('Sound error:', e);
    }
  };

  return (
    <div className="relative w-full">
      {/* Mode Toggle Button - Positioned on right side for desktop, below gamepad for mobile */}
      <div className="mode-toggle-wrapper" style={{ 
        position: 'fixed',
        top: '50%',
        right: '20px',
        transform: 'translateY(-50%)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        background: 'rgba(0, 0, 0, 0.9)',
        padding: '15px 12px',
        borderRadius: '16px',
        border: '2px solid rgba(0, 255, 200, 0.3)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
      }}>
        <span style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '8px',
          color: controlMode === '1P' ? '#60a5fa' : '#666',
          textShadow: controlMode === '1P' ? '0 0 5px rgba(96,165,250,0.5)' : 'none',
          transition: 'all 0.3s',
          writingMode: 'vertical-rl',
          textOrientation: 'upright',
          letterSpacing: '2px'
        }}>
          1P
        </span>
        
        <button 
          onClick={() => { 
            playSound('/UI SELECT.wav');
            handleModeSwitch(controlMode === '1P' ? '2P' : '1P');
          }}
          style={{
            position: 'relative',
            width: '28px',
            height: '60px',
            borderRadius: '14px',
            border: '2px solid rgba(0,255,200,0.3)',
            background: controlMode === '1P' ? 'linear-gradient(180deg, rgba(96,165,250,0.2), rgba(96,165,250,0.1))' : 'linear-gradient(180deg, rgba(74,222,128,0.1), rgba(74,222,128,0.2))',
            cursor: 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.1)'
          }}
          title={controlMode === '1P' ? 'Gamepad→P1, Keyboard→P2' : 'Keyboard→P1, Gamepad→P2'}
        >
          <div style={{
            position: 'absolute',
            top: controlMode === '1P' ? '2px' : '32px',
            left: '2px',
            width: '22px',
            height: '22px',
            borderRadius: '11px',
            background: controlMode === '1P' ? 'radial-gradient(circle at 30% 30%, #60a5fa, #3b82f6)' : 'radial-gradient(circle at 30% 30%, #4ade80, #22c55e)',
            boxShadow: controlMode === '1P' ? '0 0 8px rgba(96,165,250,0.6)' : '0 0 8px rgba(74,222,128,0.6)',
            transition: 'all 0.3s ease',
            border: '1px solid rgba(255,255,255,0.2)'
          }} />
        </button>
        
        <span style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '8px',
          color: controlMode === '2P' ? '#4ade80' : '#666',
          textShadow: controlMode === '2P' ? '0 0 5px rgba(74,222,128,0.5)' : 'none',
          transition: 'all 0.3s',
          writingMode: 'vertical-rl',
          textOrientation: 'upright',
          letterSpacing: '2px'
        }}>
          2P
        </span>
      </div>

      {/* Mode Description */}
      <div className="mode-description-wrapper" style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        textAlign: 'center',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '7px',
        color: '#888',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '8px 16px',
        borderRadius: '8px',
        lineHeight: '1.6'
      }}>
        {controlMode === '1P' ? (
          <div>
            🎮 Gamepad → Player 1<br/>
            ⌨️ Keyboard → Player 2
          </div>
        ) : (
          <div>
            ⌨️ Keyboard → Player 1<br/>
            🎮 Gamepad → Player 2
          </div>
        )}
      </div>

      {/* Render the appropriate EmulatorScreen component */}
      {controlMode === '1P' ? (
        <EmulatorScreen1P key={key} core={core} extensions={extensions} />
      ) : (
        <EmulatorScreen2P key={key} core={core} extensions={extensions} />
      )}

      {/* Mobile-specific styles */}
      <style>{`
        @media (max-width: 768px) {
          .mode-toggle-wrapper {
            position: fixed !important;
            top: auto !important;
            bottom: 20px !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            flex-direction: row !important;
            padding: 12px 15px !important;
          }
          
          .mode-toggle-wrapper span {
            writing-mode: horizontal-tb !important;
            text-orientation: mixed !important;
            letter-spacing: 0px !important;
          }
          
          .mode-toggle-wrapper button {
            width: 60px !important;
            height: 28px !important;
          }
          
          .mode-toggle-wrapper button > div {
            top: 2px !important;
            left: ${controlMode === '1P' ? '2px' : '32px'} !important;
          }
          
          .mode-description-wrapper {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
