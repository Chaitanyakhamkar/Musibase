import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import SongDetails from './pages/SongDetails';
import { SpeedInsights } from '@vercel/speed-insights/react';

import { AuthProvider } from './AuthContext';
import { PlayerProvider } from './PlayerContext';
import GlobalPlayer from './components/GlobalPlayer';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';

function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <BrowserRouter>
          <div className="app-container">
            <Navbar />
            <main style={{ paddingBottom: '80px' }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/song/:id" element={<SongDetails />} />
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </main>
            <Footer />
            <GlobalPlayer />
          </div>
        </BrowserRouter>
      </PlayerProvider>
      <SpeedInsights />
    </AuthProvider>
  );
}

export default App;
