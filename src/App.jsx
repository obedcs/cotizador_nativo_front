import React, { useState, useEffect, useCallback } from 'react';
import logoNativo from './assets/logo-nativo.png';
import Login from './components/Login.jsx';
import './App.css';

const API_URL = 'http://localhost:4000/api';
//const API_URL = 'https://resilient-forgiveness-production-3c3e7bf6.up.railway.app/api';

// Nuevo logotipo oficial de Nativo Web Design
const NativoLogo = () => (
  <div className="nativo-brand">
    <img
      src={logoNativo}
      alt="NATIVO { WEB, DESIGN; }"
      className="nativo-logo-img"
    />
  </div>
);

export default function App() {
  // Estado de autenticación
  const [token, setToken] = useState(
    () => localStorage.getItem('nativo_token') || sessionStorage.getItem('nativo_token') || ''
  );
  const [usuarioActual, setUsuarioActual] = useState(() => {
    const saved = localStorage.getItem('nativo_usuario') || sessionStorage.getItem('nativo_usuario');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [verificandoSesion, setVerificandoSesion] = useState(Boolean(token));
  const [mensajeSesion, setMensajeSesion] = useState('');

  const hoy = new Date().toISOString().split('T')[0];
  const enQuinceDias = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const [vistaActiva, setVistaActiva] = useState('editor'); // 'editor' | 'historial' | 'catalogo' | 'usuarios'
  const [cotizacionesGuardadas, setCotizacionesGuardadas] = useState([]);
  const [serviciosCatalogo, setServiciosCatalogo] = useState([]);
  const [usuariosLista, setUsuariosLista] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [alerta, setAlerta] = useState(null);

  // Estado del formulario de cotización
  const [cotizacionId, setCotizacionId] = useState(null);
  const [folio, setFolio] = useState('BORRADOR');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmpresa, setClienteEmpresa] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('52');
  const [fechaEmision, setFechaEmision] = useState(hoy);
  const [fechaVencimiento, setFechaVencimiento] = useState(enQuinceDias);
  const [aplicarIva, setAplicarIva] = useState(true);
  const [notas, setNotas] = useState(
    '50% de anticipo al iniciar el proyecto y 50% al finalizar. Precios expresados en Pesos Mexicanos (MXN).'
  );
  const [items, setItems] = useState([
    {
      descripcion: 'Sitio Web Corporativo',
      detalle: 'Hasta 5 secciones administrables, optimización de velocidad, SEO técnico inicial y certificado SSL.',
      cantidad: 1,
      precio_unitario: 7500
    }
  ]);

  // Estado para el módulo administrable de servicios
  const [servicioEditandoId, setServicioEditandoId] = useState(null);
  const [servicioDesc, setServicioDesc] = useState('');
  const [servicioDetalle, setServicioDetalle] = useState('');
  const [servicioPrecio, setServicioPrecio] = useState('');

  // Estado para crear nuevos usuarios (solo rol admin)
  const [nuevoUsuarioNombre, setNuevoUsuarioNombre] = useState('');
  const [nuevoUsuarioUser, setNuevoUsuarioUser] = useState('');
  const [nuevoUsuarioEmail, setNuevoUsuarioEmail] = useState('');
  const [nuevoUsuarioPass, setNuevoUsuarioPass] = useState('');
  const [nuevoUsuarioRol, setNuevoUsuarioRol] = useState('ventas');

  const limpiarDatosSesion = useCallback((motivo = '') => {
    localStorage.removeItem('nativo_token');
    localStorage.removeItem('nativo_usuario');
    sessionStorage.removeItem('nativo_token');
    sessionStorage.removeItem('nativo_usuario');
    setToken('');
    setUsuarioActual(null);
    if (motivo) setMensajeSesion(motivo);
  }, []);

  // Helper fetch autenticado con Bearer Token
  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
      };
      const resp = await fetch(url, { ...options, headers });
      if (resp.status === 401) {
        limpiarDatosSesion('Tu sesión expiró. Por favor inicia sesión nuevamente.');
        throw new Error('Sesión expirada.');
      }
      return resp;
    },
    [token, limpiarDatosSesion]
  );

  const mostrarAlerta = (tipo, texto) => {
    setAlerta({ tipo, texto });
    setTimeout(() => setAlerta(null), 7000);
  };

  const cargarHistorial = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await authFetch(`${API_URL}/cotizaciones`);
      if (resp.ok) {
        const data = await resp.json();
        setCotizacionesGuardadas(data);
      }
    } catch (err) {
      console.error('Error conectando con el backend:', err);
    }
  }, [token, authFetch]);

  const cargarServicios = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await authFetch(`${API_URL}/servicios`);
      if (resp.ok) {
        const data = await resp.json();
        setServiciosCatalogo(data);
      }
    } catch (err) {
      console.error('Error cargando catálogo de servicios:', err);
    }
  }, [token, authFetch]);

  const cargarUsuarios = useCallback(async () => {
    if (!token || usuarioActual?.rol !== 'admin') return;
    try {
      const resp = await authFetch(`${API_URL}/usuarios`);
      if (resp.ok) {
        const data = await resp.json();
        setUsuariosLista(data);
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  }, [token, usuarioActual, authFetch]);

  // Validar token guardado al cargar la página
  useEffect(() => {
    const validarSesion = async () => {
      if (!token) {
        setVerificandoSesion(false);
        return;
      }
      try {
        const resp = await fetch(`${API_URL}/auth/perfil`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) {
          limpiarDatosSesion('Tu sesión anterior ya no es válida. Inicia sesión nuevamente.');
        } else {
          const data = await resp.json();
          setUsuarioActual(data.usuario);
        }
      } catch {
        // Si el backend aún no responde, conservamos el token hasta que se intente operar
      } finally {
        setVerificandoSesion(false);
      }
    };

    validarSesion();
  }, [token, limpiarDatosSesion]);

  useEffect(() => {
    if (token && !verificandoSesion) {
      cargarHistorial();
      cargarServicios();
      if (usuarioActual?.rol === 'admin') {
        cargarUsuarios();
      }
    }
  }, [token, verificandoSesion, usuarioActual, cargarHistorial, cargarServicios, cargarUsuarios]);

  const handleLoginSuccess = (nuevoToken, datosUsuario, recordar) => {
    setMensajeSesion('');
    setToken(nuevoToken);
    setUsuarioActual(datosUsuario);
    setVistaActiva('editor');

    const storage = recordar ? localStorage : sessionStorage;
    storage.setItem('nativo_token', nuevoToken);
    storage.setItem('nativo_usuario', JSON.stringify(datosUsuario));
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch {
      // Ignorar errores de red al cerrar sesión
    } finally {
      limpiarDatosSesion('');
    }
  };

  // Pantalla de carga inicial de sesión
  if (verificandoSesion) {
    return (
      <div className="login-page">
        <div className="login-loading-box">
          <NativoLogo />
          <p>Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no hay sesión iniciada, mostrar la pantalla de Login
  if (!token || !usuarioActual) {
    return <Login onLoginSuccess={handleLoginSuccess} mensajeSesion={mensajeSesion} />;
  }

  // Cálculos financieros
  const subtotal = items.reduce(
    (acc, item) => acc + Number(item.cantidad || 0) * Number(item.precio_unitario || 0),
    0
  );
  const iva = aplicarIva ? subtotal * 0.16 : 0;
  const total = subtotal + iva;

  const formatoMoneda = (valor) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(Number(valor || 0));

  // Gestión de conceptos en cotización
  const agregarItem = (servicio = null) => {
    if (servicio) {
      setItems([
        ...items,
        {
          descripcion: servicio.descripcion,
          detalle: servicio.detalle || '',
          cantidad: 1,
          precio_unitario: Number(servicio.precio_unitario)
        }
      ]);
    } else {
      setItems([
        ...items,
        { descripcion: '', detalle: '', cantidad: 1, precio_unitario: 0 }
      ]);
    }
  };

  const actualizarItem = (index, campo, valor) => {
    const copia = [...items];
    copia[index][campo] = valor;
    setItems(copia);
  };

  const eliminarItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const limpiarFormulario = () => {
    setCotizacionId(null);
    setFolio('BORRADOR');
    setClienteNombre('');
    setClienteEmpresa('');
    setClienteEmail('');
    setClienteTelefono('52');
    setFechaEmision(hoy);
    setFechaVencimiento(enQuinceDias);
    setAplicarIva(true);
    setNotas('50% de anticipo al iniciar el proyecto y 50% al finalizar. Precios expresados en Pesos Mexicanos (MXN).');
    setItems([{ descripcion: '', detalle: '', cantidad: 1, precio_unitario: 0 }]);
  };

  // Guardar cotización en MySQL
  const handleGuardarMySQL = async (e) => {
    if (e) e.preventDefault();
    if (!clienteNombre.trim() || !clienteEmail.trim()) {
      mostrarAlerta('error', 'Ingresa al menos el nombre y correo electrónico del cliente.');
      return null;
    }

    setCargando(true);
    try {
      const payload = {
        cliente_nombre: clienteNombre,
        cliente_empresa: clienteEmpresa,
        cliente_email: clienteEmail,
        cliente_telefono: clienteTelefono,
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVencimiento,
        aplicar_iva: aplicarIva,
        subtotal,
        iva,
        total,
        notas,
        items
      };

      const resp = await authFetch(`${API_URL}/cotizaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al guardar');

      setCotizacionId(data.id);
      setFolio(data.folio);
      mostrarAlerta('exito', `Cotización guardada en MySQL con folio ${data.folio}`);
      cargarHistorial();
      return data;
    } catch (err) {
      mostrarAlerta('error', err.message);
      return null;
    } finally {
      setCargando(false);
    }
  };

  // Solicitar el Blob PDF generado al servidor (con logotipo de Nativo incluido)
  const obtenerPdfBlob = async (folioDoc) => {
    const resp = await authFetch(`${API_URL}/cotizaciones/generar-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folio: folioDoc,
        cliente_nombre: clienteNombre,
        cliente_empresa: clienteEmpresa,
        cliente_email: clienteEmail,
        cliente_telefono: clienteTelefono,
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVencimiento,
        aplicar_iva: aplicarIva,
        subtotal,
        iva,
        total,
        notas,
        items
      })
    });
    if (!resp.ok) throw new Error('No se pudo generar el documento PDF.');
    return await resp.blob();
  };

  const descargarBlobComoArchivo = (blob, nombreArchivo) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // Generar PDF y enviar por WhatsApp
  const handleEnviarWhatsApp = async () => {
    if (!clienteTelefono || clienteTelefono.replace(/\D/g, '').length < 10) {
      mostrarAlerta('error', 'Ingresa un número de WhatsApp válido con lada (ej. 529931234567).');
      return;
    }

    setCargando(true);
    try {
      let idActual = cotizacionId;
      let folioActual = folio;

      if (!idActual && clienteNombre.trim() && clienteEmail.trim()) {
        const guardada = await handleGuardarMySQL();
        if (guardada) {
          idActual = guardada.id;
          folioActual = guardada.folio;
        }
      }

      const pdfBlob = await obtenerPdfBlob(folioActual);
      const nombreArchivo = `Cotizacion-${folioActual}.pdf`;
      const pdfFile = new File([pdfBlob], nombreArchivo, { type: 'application/pdf' });

      const numeroLimpio = clienteTelefono.replace(/\D/g, '');
      const mensaje = [
        `*NATIVO { WEB, DESIGN; }*`,
        `Hola *${clienteNombre || 'estimado cliente'}*, te envío tu cotización *${folioActual}* en formato PDF.`,
        ``,
        `*Total:* *${formatoMoneda(total)} MXN*`,
        `*Vigencia:* ${fechaVencimiento}`,
        ``,
        `Quedamos a tus órdenes para iniciar tu proyecto.`
      ].join('\n');

      if (idActual) {
        await authFetch(`${API_URL}/cotizaciones/${idActual}/estado`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'enviada' })
        });
        cargarHistorial();
      }

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Cotización ${folioActual} - Nativo Web Design`,
          text: mensaje
        });
        mostrarAlerta('exito', `PDF ${nombreArchivo} generado y compartido.`);
      } else {
        descargarBlobComoArchivo(pdfBlob, nombreArchivo);
        const urlWhatsApp = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
        window.open(urlWhatsApp, '_blank', 'noopener,noreferrer');
        mostrarAlerta(
          'exito',
          `PDF (${nombreArchivo}) generado y descargado. Adjúntalo en la ventana de WhatsApp que se acaba de abrir.`
        );
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        mostrarAlerta('error', err.message || 'Error al generar o enviar el PDF por WhatsApp.');
      }
    } finally {
      setCargando(false);
    }
  };

  // Enviar por Correo Electrónico con PDF adjunto automático
  const handleEnviarCorreo = async () => {
    if (!clienteEmail.trim()) {
      mostrarAlerta('error', 'Ingresa el correo electrónico del cliente.');
      return;
    }

    setCargando(true);
    try {
      let idActual = cotizacionId;
      let folioActual = folio;

      if (!idActual) {
        const guardada = await handleGuardarMySQL();
        if (guardada) {
          idActual = guardada.id;
          folioActual = guardada.folio;
        }
      }

      const resp = await authFetch(`${API_URL}/cotizaciones/enviar-correo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: idActual,
          folio: folioActual,
          cliente_nombre: clienteNombre,
          cliente_empresa: clienteEmpresa,
          cliente_email: clienteEmail,
          cliente_telefono: clienteTelefono,
          fecha_emision: fechaEmision,
          fecha_vencimiento: fechaVencimiento,
          aplicar_iva: aplicarIva,
          subtotal,
          iva,
          total,
          notas,
          items
        })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'No se pudo enviar el correo');

      mostrarAlerta('exito', data.mensaje);
      cargarHistorial();
    } catch (err) {
      mostrarAlerta('error', err.message);
    } finally {
      setCargando(false);
    }
  };

  // Descargar PDF directo generado desde el servidor
  const handleDescargarPDF = async () => {
    setCargando(true);
    try {
      const pdfBlob = await obtenerPdfBlob(folio);
      descargarBlobComoArchivo(pdfBlob, `${folio || 'Cotizacion-Nativo'}.pdf`);
      mostrarAlerta('exito', 'PDF descargado correctamente.');
    } catch (err) {
      mostrarAlerta('error', err.message);
    } finally {
      setCargando(false);
    }
  };

  // Cargar cotización en el editor
  const cargarCotizacionEnEditor = (cot) => {
    setCotizacionId(cot.id);
    setFolio(cot.folio);
    setClienteNombre(cot.cliente_nombre);
    setClienteEmpresa(cot.cliente_empresa || '');
    setClienteEmail(cot.cliente_email);
    setClienteTelefono(cot.cliente_telefono);
    setFechaEmision(cot.fecha_emision.split('T')[0]);
    setFechaVencimiento(cot.fecha_vencimiento.split('T')[0]);
    setAplicarIva(Boolean(cot.aplicar_iva));
    setNotas(cot.notas || '');
    setItems(
      cot.items.map((i) => ({
        descripcion: i.descripcion,
        detalle: i.detalle || '',
        cantidad: i.cantidad,
        precio_unitario: Number(i.precio_unitario)
      }))
    );
    setVistaActiva('editor');
  };

  const eliminarCotizacion = async (id) => {
    if (!window.confirm('¿Deseas eliminar esta cotización de la base de datos?')) return;
    try {
      await authFetch(`${API_URL}/cotizaciones/${id}`, { method: 'DELETE' });
      mostrarAlerta('exito', 'Cotización eliminada.');
      cargarHistorial();
    } catch (err) {
      mostrarAlerta('error', 'Error al eliminar la cotización.');
    }
  };

  // ==========================================
  // CRUD CATÁLOGO DE SERVICIOS EN MYSQL
  // ==========================================
  const handleGuardarServicio = async (e) => {
    e.preventDefault();
    if (!servicioDesc.trim()) return;

    try {
      const url = servicioEditandoId
        ? `${API_URL}/servicios/${servicioEditandoId}`
        : `${API_URL}/servicios`;
      const method = servicioEditandoId ? 'PUT' : 'POST';

      const resp = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: servicioDesc,
          detalle: servicioDetalle,
          precio_unitario: Number(servicioPrecio || 0)
        })
      });

      if (!resp.ok) throw new Error('Error al guardar el servicio en MySQL');

      mostrarAlerta(
        'exito',
        servicioEditandoId ? 'Servicio actualizado en MySQL.' : 'Servicio agregado al catálogo.'
      );
      setServicioEditandoId(null);
      setServicioDesc('');
      setServicioDetalle('');
      setServicioPrecio('');
      cargarServicios();
    } catch (err) {
      mostrarAlerta('error', err.message);
    }
  };

  const editarServicio = (srv) => {
    setServicioEditandoId(srv.id);
    setServicioDesc(srv.descripcion);
    setServicioDetalle(srv.detalle || '');
    setServicioPrecio(srv.precio_unitario);
  };

  const cancelarEdicionServicio = () => {
    setServicioEditandoId(null);
    setServicioDesc('');
    setServicioDetalle('');
    setServicioPrecio('');
  };

  const eliminarServicio = async (id) => {
    if (!window.confirm('¿Eliminar este servicio del catálogo?')) return;
    try {
      await authFetch(`${API_URL}/servicios/${id}`, { method: 'DELETE' });
      mostrarAlerta('exito', 'Servicio eliminado del catálogo.');
      cargarServicios();
    } catch (err) {
      mostrarAlerta('error', 'Error al eliminar el servicio.');
    }
  };

  // ==========================================
  // CRUD USUARIOS DEL SISTEMA (ROL ADMIN)
  // ==========================================
  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    try {
      const resp = await authFetch(`${API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoUsuarioNombre,
          usuario: nuevoUsuarioUser,
          email: nuevoUsuarioEmail,
          password: nuevoUsuarioPass,
          rol: nuevoUsuarioRol
        })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al crear el usuario.');

      mostrarAlerta('exito', `Usuario ${data.usuario} creado correctamente.`);
      setNuevoUsuarioNombre('');
      setNuevoUsuarioUser('');
      setNuevoUsuarioEmail('');
      setNuevoUsuarioPass('');
      setNuevoUsuarioRol('ventas');
      cargarUsuarios();
    } catch (err) {
      mostrarAlerta('error', err.message);
    }
  };

  const toggleEstadoUsuario = async (usr) => {
    try {
      const resp = await authFetch(`${API_URL}/usuarios/${usr.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !usr.activo })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'No se pudo cambiar el estado.');
      mostrarAlerta('exito', data.mensaje);
      cargarUsuarios();
    } catch (err) {
      mostrarAlerta('error', err.message);
    }
  };

  const cotizacionesFiltradas = cotizacionesGuardadas.filter(
    (c) =>
      c.folio.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.cliente_empresa || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="app-container">
      <header className="topbar no-print">
        <div className="topbar-inner">
          <NativoLogo />
          <nav className="nav-tabs">
            <button
              type="button"
              className={`nav-btn ${vistaActiva === 'editor' ? 'active' : ''}`}
              onClick={() => setVistaActiva('editor')}
            >
              + Nueva Cotización
            </button>
            <button
              type="button"
              className={`nav-btn ${vistaActiva === 'historial' ? 'active' : ''}`}
              onClick={() => {
                cargarHistorial();
                setVistaActiva('historial');
              }}
            >
              Historial MySQL ({cotizacionesGuardadas.length})
            </button>
            <button
              type="button"
              className={`nav-btn ${vistaActiva === 'catalogo' ? 'active' : ''}`}
              onClick={() => {
                cargarServicios();
                setVistaActiva('catalogo');
              }}
            >
              Catálogo ({serviciosCatalogo.length})
            </button>
            {usuarioActual.rol === 'admin' && (
              <button
                type="button"
                className={`nav-btn ${vistaActiva === 'usuarios' ? 'active' : ''}`}
                onClick={() => {
                  cargarUsuarios();
                  setVistaActiva('usuarios');
                }}
              >
                Usuarios ({usuariosLista.length})
              </button>
            )}
          </nav>

          <div className="user-session-bar">
            <div className="user-badge-info">
              <span className="user-name">{usuarioActual.nombre}</span>
              <span className="user-role-tag">{usuarioActual.rol}</span>
            </div>
            <button type="button" className="btn-logout" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {alerta && (
        <div className={`toast-alert toast-${alerta.tipo} no-print`}>
          {alerta.texto}
        </div>
      )}

      {/* VISTA 1: EDITOR DE COTIZACIÓN + VISTA PREVIA */}
      {vistaActiva === 'editor' && (
        <main className="workspace-grid">
          <section className="panel-editor no-print">
            <div className="panel-header">
              <h2>Datos de la Cotización</h2>
              <button type="button" className="btn-ghost" onClick={limpiarFormulario}>
                Limpiar todo
              </button>
            </div>

            <form onSubmit={handleGuardarMySQL}>
              <div className="form-section">
                <h3>1. Información del Cliente</h3>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Nombre del Cliente *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Ana Laura Gómez"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Empresa o Negocio</label>
                    <input
                      type="text"
                      placeholder="Ej. Consultorio Dental Gómez"
                      value={clienteEmpresa}
                      onChange={(e) => setClienteEmpresa(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Correo Electrónico *</label>
                    <input
                      type="email"
                      required
                      placeholder="cliente@empresa.com"
                      value={clienteEmail}
                      onChange={(e) => setClienteEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>WhatsApp (con código país) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="529931234567"
                      value={clienteTelefono}
                      onChange={(e) => setClienteTelefono(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha de Emisión</label>
                    <input
                      type="date"
                      value={fechaEmision}
                      onChange={(e) => setFechaEmision(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Válida Hasta</label>
                    <input
                      type="date"
                      value={fechaVencimiento}
                      onChange={(e) => setFechaVencimiento(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="section-title-row">
                  <h3>2. Conceptos y Servicios</h3>
                  <div className="quick-add">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value !== '') {
                          agregarItem(serviciosCatalogo[Number(e.target.value)]);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="" disabled>
                        + Agregar desde catálogo MySQL...
                      </option>
                      {serviciosCatalogo.map((srv, i) => (
                        <option key={srv.id} value={i}>
                          {srv.descripcion} ({formatoMoneda(srv.precio_unitario)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {items.map((item, index) => (
                  <div className="item-card" key={index}>
                    <div className="item-card-top">
                      <input
                        type="text"
                        required
                        placeholder="Nombre del servicio o producto"
                        value={item.descripcion}
                        onChange={(e) => actualizarItem(index, 'descripcion', e.target.value)}
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-item"
                          onClick={() => eliminarItem(index)}
                          title="Eliminar concepto"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      className="item-detail-input"
                      placeholder="Descripción o alcance técnico (opcional)"
                      value={item.detalle}
                      onChange={(e) => actualizarItem(index, 'detalle', e.target.value)}
                    />
                    <div className="item-numbers-row">
                      <div className="form-group">
                        <label>Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.cantidad}
                          onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Precio Unitario (MXN)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={item.precio_unitario}
                          onChange={(e) =>
                            actualizarItem(index, 'precio_unitario', e.target.value)
                          }
                        />
                      </div>
                      <div className="item-subtotal-box">
                        <span>Importe</span>
                        <strong>{formatoMoneda(item.cantidad * item.precio_unitario)}</strong>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn-add-line"
                  onClick={() => agregarItem()}
                >
                  + Agregar concepto personalizado
                </button>
              </div>

              <div className="form-section">
                <h3>3. Impuestos y Condiciones</h3>
                <label className="checkbox-iva">
                  <input
                    type="checkbox"
                    checked={aplicarIva}
                    onChange={(e) => setAplicarIva(e.target.checked)}
                  />
                  <span>Incluir IVA (16%)</span>
                </label>

                <div className="form-group">
                  <label>Notas / Condiciones de pago</label>
                  <textarea
                    rows="3"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                  />
                </div>
              </div>

              <div className="actions-bar">
                <button type="submit" className="btn-primary" disabled={cargando}>
                  {cargando ? 'Procesando...' : 'Guardar en MySQL'}
                </button>
                <button
                  type="button"
                  className="btn-whatsapp"
                  onClick={handleEnviarWhatsApp}
                  disabled={cargando}
                >
                  {cargando ? 'Generando PDF...' : 'Enviar PDF por WhatsApp'}
                </button>
                <button
                  type="button"
                  className="btn-email"
                  onClick={handleEnviarCorreo}
                  disabled={cargando}
                >
                  Enviar Correo + PDF
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleDescargarPDF}
                  disabled={cargando}
                >
                  Descargar PDF
                </button>
              </div>
            </form>
          </section>

          <section className="panel-preview">
            <div className="quote-sheet">
              <div className="quote-sheet-header">
                <NativoLogo />
                <div className="quote-meta">
                  <span className="quote-badge">COTIZACIÓN</span>
                  <p className="quote-folio">{folio}</p>
                  <p>Emisión: {fechaEmision}</p>
                  <p>Vigencia: {fechaVencimiento}</p>
                </div>
              </div>

              <div className="quote-client-box">
                <div>
                  <span className="label-muted">PREPARADO PARA:</span>
                  <h4>{clienteNombre || 'Nombre del Cliente'}</h4>
                  {clienteEmpresa && <p>{clienteEmpresa}</p>}
                </div>
                <div className="quote-client-contact">
                  <p>{clienteEmail || 'correo@cliente.com'}</p>
                  <p>Tel: {clienteTelefono || '—'}</p>
                </div>
              </div>

              <div className="table-responsive">
                <table className="quote-table">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th className="text-center">Cant.</th>
                      <th className="text-right">P. Unitario</th>
                      <th className="text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{item.descripcion || 'Concepto sin título'}</strong>
                          {item.detalle && <small>{item.detalle}</small>}
                        </td>
                        <td className="text-center">{item.cantidad}</td>
                        <td className="text-right">{formatoMoneda(item.precio_unitario)}</td>
                        <td className="text-right font-bold">
                          {formatoMoneda(item.cantidad * item.precio_unitario)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="quote-totals">
                <div className="total-row">
                  <span>Subtotal</span>
                  <span>{formatoMoneda(subtotal)}</span>
                </div>
                {aplicarIva && (
                  <div className="total-row">
                    <span>IVA (16%)</span>
                    <span>{formatoMoneda(iva)}</span>
                  </div>
                )}
                <div className="total-row grand-total">
                  <span>TOTAL MXN</span>
                  <span>{formatoMoneda(total)}</span>
                </div>
              </div>

              {notas && (
                <div className="quote-notes">
                  <strong>Condiciones y Observaciones:</strong>
                  <p>{notas}</p>
                </div>
              )}

              <footer className="quote-footer">
                <p>Nativo Web Design • Desarrollo Web, Sistemas a Medida y Diseño Digital</p>
              </footer>
            </div>
          </section>
        </main>
      )}

      {/* VISTA 2: HISTORIAL DE COTIZACIONES MYSQL */}
      {vistaActiva === 'historial' && (
        <main className="history-container">
          <div className="history-header">
            <h2>Cotizaciones Guardadas en MySQL</h2>
            <input
              type="search"
              className="search-input"
              placeholder="Buscar por folio, cliente o empresa..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="table-responsive">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cotizacionesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      No hay cotizaciones registradas con ese criterio.
                    </td>
                  </tr>
                ) : (
                  cotizacionesFiltradas.map((cot) => (
                    <tr key={cot.id}>
                      <td className="font-bold">
                        <div>{cot.folio}</div>
                        {cot.creado_por && (
                          <small className="text-muted">Por: {cot.creado_por}</small>
                        )}
                      </td>
                      <td>
                        <div>{cot.cliente_nombre}</div>
                        <small className="text-muted">{cot.cliente_empresa}</small>
                      </td>
                      <td>
                        <div>{cot.cliente_email}</div>
                        <small className="text-muted">{cot.cliente_telefono}</small>
                      </td>
                      <td>{cot.fecha_emision.split('T')[0]}</td>
                      <td className="font-bold">{formatoMoneda(cot.total)}</td>
                      <td>
                        <span className={`status-pill status-${cot.estado}`}>
                          {cot.estado}
                        </span>
                      </td>
                      <td className="history-actions">
                        <button
                          type="button"
                          className="btn-sm-load"
                          onClick={() => cargarCotizacionEnEditor(cot)}
                        >
                          Abrir / Reenviar
                        </button>
                        <button
                          type="button"
                          className="btn-sm-delete"
                          onClick={() => eliminarCotizacion(cot.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {/* VISTA 3: CATÁLOGO ADMINISTRABLE DE SERVICIOS EN MYSQL */}
      {vistaActiva === 'catalogo' && (
        <main className="catalog-grid">
          <section className="panel-editor">
            <div className="panel-header">
              <h2>{servicioEditandoId ? 'Editar Servicio' : 'Nuevo Servicio en Catálogo'}</h2>
              {servicioEditandoId && (
                <button type="button" className="btn-ghost" onClick={cancelarEdicionServicio}>
                  Cancelar
                </button>
              )}
            </div>

            <form onSubmit={handleGuardarServicio} className="catalog-form">
              <div className="form-group">
                <label>Nombre del Servicio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Rediseño Web Express"
                  value={servicioDesc}
                  onChange={(e) => setServicioDesc(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Descripción / Alcance Técnico</label>
                <textarea
                  rows="3"
                  placeholder="Detalle que aparecerá automáticamente en la cotización..."
                  value={servicioDetalle}
                  onChange={(e) => setServicioDetalle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Precio Base (MXN) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={servicioPrecio}
                  onChange={(e) => setServicioPrecio(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary full-width">
                {servicioEditandoId ? 'Actualizar Servicio en MySQL' : '+ Guardar en Catálogo MySQL'}
              </button>
            </form>
          </section>

          <section className="history-container no-margin">
            <div className="history-header">
              <h2>Servicios Registrados ({serviciosCatalogo.length})</h2>
            </div>

            <div className="table-responsive">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th>Precio Base</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {serviciosCatalogo.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="empty-state">
                        No hay servicios en el catálogo. Agrega el primero a la izquierda.
                      </td>
                    </tr>
                  ) : (
                    serviciosCatalogo.map((srv) => (
                      <tr key={srv.id}>
                        <td>
                          <div className="font-bold">{srv.descripcion}</div>
                          {srv.detalle && <small className="text-muted">{srv.detalle}</small>}
                        </td>
                        <td className="font-bold">{formatoMoneda(srv.precio_unitario)}</td>
                        <td className="history-actions">
                          <button
                            type="button"
                            className="btn-sm-load"
                            onClick={() => editarServicio(srv)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn-sm-delete"
                            onClick={() => eliminarServicio(srv.id)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}

      {/* VISTA 4: ADMINISTRACIÓN DE USUARIOS (SOLO ADMIN) */}
      {vistaActiva === 'usuarios' && usuarioActual.rol === 'admin' && (
        <main className="catalog-grid">
          <section className="panel-editor">
            <div className="panel-header">
              <h2>Nuevo Usuario de Acceso</h2>
            </div>

            <form onSubmit={handleCrearUsuario} className="catalog-form">
              <div className="form-group">
                <label>Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Laura Martínez"
                  value={nuevoUsuarioNombre}
                  onChange={(e) => setNuevoUsuarioNombre(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Nombre de Usuario *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. lmartinez"
                  value={nuevoUsuarioUser}
                  onChange={(e) => setNuevoUsuarioUser(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  placeholder="ventas@nativowebdesign.com"
                  value={nuevoUsuarioEmail}
                  onChange={(e) => setNuevoUsuarioEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Contraseña (mín. 6 caracteres) *</label>
                <input
                  type="password"
                  required
                  minLength="6"
                  placeholder="••••••••"
                  value={nuevoUsuarioPass}
                  onChange={(e) => setNuevoUsuarioPass(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Rol en el Sistema</label>
                <select
                  value={nuevoUsuarioRol}
                  onChange={(e) => setNuevoUsuarioRol(e.target.value)}
                  className="select-full"
                >
                  <option value="ventas">Ventas / Cotizador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <button type="submit" className="btn-primary full-width">
                + Crear Usuario en MySQL
              </button>
            </form>
          </section>

          <section className="history-container no-margin">
            <div className="history-header">
              <h2>Usuarios Registrados ({usuariosLista.length})</h2>
            </div>

            <div className="table-responsive">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Nombre / Usuario</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosLista.map((usr) => (
                    <tr key={usr.id}>
                      <td>
                        <div className="font-bold">{usr.nombre}</div>
                        <small className="text-muted">@{usr.usuario}</small>
                      </td>
                      <td>{usr.email}</td>
                      <td>
                        <span className="status-pill status-aceptada">{usr.rol}</span>
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            usr.activo ? 'status-enviada' : 'status-borrador'
                          }`}
                        >
                          {usr.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="history-actions">
                        {usr.id !== usuarioActual.id && (
                          <button
                            type="button"
                            className={usr.activo ? 'btn-sm-delete' : 'btn-sm-load'}
                            onClick={() => toggleEstadoUsuario(usr)}
                          >
                            {usr.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
