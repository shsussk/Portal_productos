(function () {
  if (!window.SESION) {
    window.SESION = {
      id: 'local-admin',
      nombre: 'Francis Peralta',
      email: 'francis@local.app',
      rol: 'admin'
    };
  }

  window.AuthGuard = {
    getSession: function () {
      return window.SESION;
    },
    requireSession: function () {
      return window.SESION;
    },
    requireRole: function () {
      return true;
    },
    saveSession: function (sesion) {
      window.SESION = Object.assign({
        id: 'local-user',
        nombre: 'Usuario',
        email: '',
        rol: 'usuario'
      }, sesion || {});
      return window.SESION;
    },
    clearSession: function () {
      window.SESION = null;
      return null;
    },
    logout: function () {
      window.SESION = null;
      alert('Sesión local cerrada.');
    }
  };
})();
