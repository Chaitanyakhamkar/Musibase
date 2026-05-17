import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Music, AlertCircle } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const switchTab = (toSignUp) => {
    setIsSignUp(toSignUp);
    setError(null);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        navigate('/');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first to reset your password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      alert('Check your email for a password reset link!');
    } catch (err) {
      setError(err.message || 'Error sending password reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="bg-glow"></div>
      <div className="container login-container">
        
        <div className="login-card glass-panel">
          <div className="login-header">
            <div className="logo-circle" style={{ margin: '0 auto 16px' }}>
              <Music size={20} strokeWidth={3} />
            </div>
            
            <div className="auth-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
              <button 
                type="button" 
                onClick={() => switchTab(false)}
                style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', color: !isSignUp ? '#fff' : 'var(--text-muted)', borderBottom: !isSignUp ? '2px solid var(--primary-color)' : '2px solid transparent', cursor: 'pointer', fontSize: '15px', fontWeight: 600, transition: 'all 0.2s ease' }}
              >
                Log In
              </button>
              <button 
                type="button" 
                onClick={() => switchTab(true)}
                style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', color: isSignUp ? '#fff' : 'var(--text-muted)', borderBottom: isSignUp ? '2px solid var(--primary-color)' : '2px solid transparent', cursor: 'pointer', fontSize: '15px', fontWeight: 600, transition: 'all 0.2s ease' }}
              >
                Register via Email
              </button>
            </div>

            <h2>{isSignUp ? 'Create an Account' : 'Welcome Back'}</h2>
            <p className="login-subtitle">
              {isSignUp ? 'Sign up securely with your email address to save music.' : 'Sign in to access your favorites and playlists.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="login-form">
            {error && (
              <div className="error-message">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            
            <div className="input-group">
              <label className="input-label">Email address</label>
              <input 
                type="email" 
                className="input-field" 
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label" style={{ marginBottom: 0 }}>Password</label>
                {!isSignUp && (
                  <button 
                     type="button" 
                     className="btn-ghost" 
                     style={{ fontSize: '13px', padding: 0, color: 'var(--primary-color)', border: 'none', background: 'none', cursor: 'pointer' }}
                     onClick={handleForgotPassword}
                  >
                     Forgot Password?
                  </button>
                )}
              </div>
              <input 
                type="password" 
                className="input-field" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? <div className="loader" style={{width:'18px',height:'18px',margin:'0 auto'}}></div> : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </form>

        </div>

      </div>
    </div>
  );
};

export default Login;
