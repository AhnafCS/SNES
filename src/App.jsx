import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import HomePage from './HomePage';
import ConsolesPage from './ConsolesPage';
import EmulatorScreenWrapper from './components/EmulatorScreenWrapper';

/*
  src/App.jsx
  - Root application component with React Router for proper browser navigation.
  - Users can now use back/forward buttons to navigate between pages.
  - Uses EmulatorScreenWrapper to switch between 1P and 2P control modes
*/

function HomePageWrapper() {
  const navigate = useNavigate();
  return (
    <HomePage 
      onStart={() => navigate('/emulator')} 
      onShowConsoles={() => navigate('/consoles')} 
    />
  );
}

function ConsolesPageWrapper() {
  const navigate = useNavigate();
  return <ConsolesPage onBack={() => navigate('/')} />;
}

function EmulatorPageWrapper() {
  return (
    <div className="w-full">
      <EmulatorScreenWrapper core="snes9x" extensions=".smc,.sfc" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <Routes>
          <Route path="/" element={<HomePageWrapper />} />
          <Route path="/consoles" element={<ConsolesPageWrapper />} />
          <Route path="/emulator" element={<EmulatorPageWrapper />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}



