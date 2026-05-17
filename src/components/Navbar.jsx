import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, LogIn, LogOut } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../AuthContext';

const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo">
          <div className="logo-circle">
            <Music size={16} strokeWidth={3} />
          </div>
          <span>MusiBase</span>
        </Link>
        <div className="nav-links" style={{ alignItems: 'center' }}>
          <Link to="/" className="nav-link">Home</Link>
          <a href="#" className="nav-link">About</a>
          {user ? (
            <button onClick={handleSignOut} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '13px' }}>
              <LogOut size={14} style={{marginRight: '6px'}} /> Sign Out
            </button>
          ) : (
            <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              <LogIn size={14} style={{marginRight: '6px'}} /> Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
