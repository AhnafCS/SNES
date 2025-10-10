import React, { useState } from 'react';
import HomePage from './HomePage';
import EmulatorScreen from './components/EmulatorScreen';

/*
  src/App.jsx
  - Root application component. Holds simple `screen` state that can be
    extended into a basic router (e.g., 'home' | 'emulator').
  - Currently renders the `HomePage` component that ships with the scaffold.
*/
export default function App() {
  const [screen, setScreen] = useState('home');

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      {screen === 'home' && <HomePage onStart={() => setScreen('emulator')} />}
      {screen === 'emulator' && (
        <div className="w-full">
          <div className="flex justify-between items-center px-6 py-3">
            <button
              className="neon-button"
              onClick={() => setScreen('home')}
            >
              Back
            </button>
          </div>
          <EmulatorScreen />
        </div>
      )}
    </div>
  );
}



