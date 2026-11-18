import React, { useState } from 'react';
import logoNativo from '../assets/logo-nativo.png';

//const API_URL = 'http://localhost:4000/api';
const API_URL = 'https://resilient-forgiveness-production-3c3e7bf6.up.railway.app/api';

export default function Login({ onLoginSuccess, mensajeSesion }) {
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [recordarSesion, setRecordarSesion] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(mensajeSesion || '');
  const [mostrarAyuda, setMostrarAyuda] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const resp = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificador, password })
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'No se pudo iniciar sesión.');
      }

      onLoginSuccess(data.token, data.usuario, recordarSesion);
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        setError('No se pudo conectar con el servidor Backend (puerto 4000). Verifica que esté encendido.');
      } else {
        setError(err.message);
      }
    } finally {
      setCargando(false);
    }
  };

  const autocompletarDemo = () => {
    setIdentificador('admin');
    setPassword('Nativo2026!');
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand-header">
          <img
            src={logoNativo}
            alt="NATIVO { WEB, DESIGN; }"
            className="login-logo-img"
          />
          <p className="login-subtitle">Sistema de Gestión de Cotizaciones</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <h2>Iniciar Sesión</h2>
          <p className="login-desc">
            Ingresa tus credenciales para acceder al panel administrativo.
          </p>

          {error && <div className="login-alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="login-user">Usuario o Correo Electrónico</label>
            <input
              id="login-user"
              type="text"
              required
              autoFocus
              autoComplete="username"
              placeholder="admin o admin@nativowebdesign.com"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-pass">Contraseña</label>
            <div className="password-input-wrapper">
              <input
                id="login-pass"
                type={mostrarPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="btn-toggle-pass"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {mostrarPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </div>

          <div className="login-options-row">
            <label className="checkbox-remember">
              <input
                type="checkbox"
                checked={recordarSesion}
                onChange={(e) => setRecordarSesion(e.target.checked)}
              />
              <span>Mantener sesión iniciada</span>
            </label>

            <button
              type="button"
              className="btn-link-muted"
              onClick={() => setMostrarAyuda(!mostrarAyuda)}
            >
              {mostrarAyuda ? 'Ocultar acceso inicial' : 'Acceso inicial'}
            </button>
          </div>

          {mostrarAyuda && (
            <div className="login-hint-box">
              <div>
                <strong>Usuario:</strong> <code>admin</code> &nbsp;|&nbsp;{' '}
                <strong>Contraseña:</strong> <code>Nativo2026!</code>
              </div>
              <button
                type="button"
                className="btn-fill-demo"
                onClick={autocompletarDemo}
              >
                Rellenar datos
              </button>
            </div>
          )}

          <button type="submit" className="btn-login-submit" disabled={cargando}>
            {cargando ? 'Verificando acceso...' : 'Entrar al Sistema'}
          </button>
        </form>

        <div className="login-footer">
          <span>NATIVO &#123; WEB, DESIGN; &#125; • Acceso Restringido</span>
        </div>
      </div>
    </div>
  );
}
