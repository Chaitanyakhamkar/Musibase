import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { confirmPasswordReset } from 'firebase/auth';
import { KeyRound, AlertCircle } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [oobCode, setOobCode] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get('oobCode');
    if (code) {
      setOobCode(code);
    } else {
      setError("Invalid or missing password reset link.");
    }
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!oobCode) return setError('Missing recovery code from URL.');
    if (password.length < 6) {
      setError('Password should be at least 6 characters long.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Error updating password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="bg-glow"></div>
      <div className="container login-container">
        
        <div className="login-card glass-panel" style={{ textAlign: 'center' }}>
          <div className="login-header">
            <div className="logo-circle" style={{ margin: '0 auto 24px', background: 'var(--primary-color)', color: '#000', width: '48px', height: '48px' }}>
              <KeyRound size={24} strokeWidth={2.5} />
            </div>
            
            <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Set New Password</h2>
            <p className="login-subtitle" style={{ marginBottom: '32px' }}>
              Please enter your new password below.
            </p>
          </div>

          {success ? (
            <div style={{ padding: '24px', background: 'rgba(62, 207, 142, 0.1)', border: '1px solid var(--primary-color)', borderRadius: '12px', color: '#fff' }}>
              <h3 style={{ color: 'var(--primary-color)', marginBottom: '8px' }}>Password Updated!</h3>
              <p style={{ fontSize: '14px', margin: 0 }}>You can now log in with your new password. Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
              {error && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
              
              <div className="input-group">
                <label className="input-label">New Password</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '12px', padding: '14px', fontSize: '16px' }} disabled={loading}>
                {loading ? <div className="loader" style={{width:'18px',height:'18px',margin:'0 auto'}}></div> : 'Update Password'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
