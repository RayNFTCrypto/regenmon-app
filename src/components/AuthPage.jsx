import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function AuthPage() {
  const { signIn, signUp, signInWithGoogle, signInWithWallet } = useAuth();
  const { disconnect } = useDisconnect();

  const [showEmail, setShowEmail] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState('');
  const signedIn = useRef(false);

  // Auto sign-in once wallet connects
  const handleAutoSignIn = async (address) => {
    if (signedIn.current || loading) return;
    signedIn.current = true;
    setLoading(true);
    setError('');
    const { error: authError } = await signInWithWallet(address);
    if (authError) {
      setError(authError.message);
      signedIn.current = false;
    }
    setLoading(false);
  };

  // Email login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setConfirmMsg('');
    setLoading(true);

    const { error: authError } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (authError) {
      setError(authError.message);
    } else if (isSignUp) {
      setConfirmMsg('Revisa tu email para confirmar tu cuenta.');
    }

    setLoading(false);
  };

  const handleGoogle = async () => {
    setError('');
    const { error: authError } = await signInWithGoogle();
    if (authError) setError(authError.message);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-logo">Aetheria</h1>
        <p className="auth-subtitle">Conecta para entrar</p>

        {/* Wallet Connect - Primary Option using RainbowKit */}
        <ConnectButton.Custom>
          {({ account, chain, openConnectModal, mounted }) => {
            const connected = mounted && account && chain;

            // Auto sign-in when connected
            if (connected && account.address) {
              handleAutoSignIn(account.address);
            }

            if (!connected) {
              return (
                <button
                  className="btn-wallet-login"
                  onClick={openConnectModal}
                  disabled={loading}
                >
                  <span className="wallet-icon">🦊</span>
                  Conectar Wallet
                </button>
              );
            }

            return (
              <div className="wallet-connected-box">
                <p className="wallet-address">{account.displayName}</p>
                <p className="wallet-status">
                  {loading ? 'Entrando...' : 'Conectado'}
                </p>
                <button className="btn-wallet-disconnect" onClick={() => { signedIn.current = false; disconnect(); }}>
                  Desconectar Wallet
                </button>
              </div>
            );
          }}
        </ConnectButton.Custom>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-divider">
          <span>o</span>
        </div>

        {/* Google */}
        <button className="btn-google" onClick={handleGoogle}>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        {/* Email toggle */}
        {!showEmail ? (
          <button
            className="btn-show-email"
            onClick={() => setShowEmail(true)}
          >
            Usar email y password
          </button>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: 12 }}>
              <input
                type="email"
                className="auth-input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                className="auth-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />

              {confirmMsg && <p className="auth-confirm">{confirmMsg}</p>}

              <button type="submit" className="btn-auth-submit" disabled={loading}>
                {loading ? '...' : isSignUp ? 'Crear cuenta' : 'Entrar'}
              </button>
            </form>

            <p className="auth-toggle">
              {isSignUp ? 'Ya tienes cuenta?' : 'No tienes cuenta?'}{' '}
              <button
                type="button"
                className="auth-toggle-btn"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setConfirmMsg('');
                }}
              >
                {isSignUp ? 'Inicia sesion' : 'Crear cuenta'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
