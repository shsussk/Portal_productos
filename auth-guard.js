(function () {
  var STORAGE_KEY = 'portal_sesion';
  var LOGIN_PAGE = 'login.html';

  function safeParse(json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function getCurrentPath() {
    var path = window.location.pathname || '';
    return path.split('/').pop() || '';
  }

  function isLoginPage() {
    return getCurrentPath() === LOGIN_PAGE;
  }

  function getSession() {
    var raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    var sesion = safeParse(raw);
    if (!sesion || typeof sesion !== 'object') return null;

    return {
      id: sesion.id || null,
      nombre: sesion.nombre || 'Usuario',
      email: sesion.email || '',
      rol: sesion.rol || 'usuario'
    };
  }

  function saveSession(sesion) {
    if (!sesion || typeof sesion !== 'object') {
      throw new Error('La sesión debe ser un objeto válido.');
    }

    var normalized = {
      id: sesion.id || null,
      nombre: sesion.nombre || 'Usuario',
      email: sesion.email || '',
      rol: sesion.rol || 'usuario'
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.SESION = normalized;
    return normalized;
  }

  function clearSession() {
    sessionStorage.removeItem(STORAGE_KEY);
    window.SESION = null;
  }

  function redirectToLogin() {
    window.location.href = LOGIN_PAGE;
  }

  function requireSession() {
    var sesion = getSession();
    window.SESION = sesion;

    if (!sesion && !isLoginPage()) {
      redirectToLogin();
      return null;
    }

    return sesion;
  }

  function requireRole(roles) {
    var sesion = getSession();
    window.SESION = sesion;

    if (!sesion && !isLoginPage()) {
      redirectToLogin();
      return false;
    }

    if (!sesion) return false;

    if (!Array.isArray(roles)) roles = [roles];

    if (roles.indexOf(sesion.rol) === -1) {
      alert('No tienes permisos para acceder a esta página.');
      redirectToLogin();
      return false;
    }

    return true;
  }

  function logout() {
    clearSession();
    redirectToLogin();
  }

  window.AuthGuard = {
    storageKey: STORAGE_KEY,
    loginPage: LOGIN_PAGE,
    getSession: getSession,
    saveSession: saveSession,
    clearSession: clearSession,
    requireSession: requireSession,
    requireRole: requireRole,
    logout: logout
  };

  window.SESION = getSession();

  if (!isLoginPage()) {
    requireSession();
  }
})();
