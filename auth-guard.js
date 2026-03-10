// auth-guard.js
// Proteger páginas internas del portal

(function () {
  if (typeof window === 'undefined') return;

  async function protegerPaginaInterna() {
    try {
      if (!window.supabase) {
        console.error('Supabase no está disponible en window.supabase');
        window.location.href = 'login-interno.html';
        return;
      }

      const { data, error } = await window.supabase.auth.getSession();

      if (error) {
        console.error('Error al obtener la sesión:', error);
        window.location.href = 'login-interno.html';
        return;
      }

      if (!data || !data.session) {
        window.location.href = 'login-interno.html';
        return;
      }

      // Exponer usuario en window.SESION para que tu portal lo use
      window.SESION = window.SESION || {};
      window.SESION.email = data.session.user.email;
      window.SESION.id = data.session.user.id;
      window.SESION.nombre = data.session.user.user_metadata?.nombre || data.session.user.email;

      console.log('Sesión interna OK:', window.SESION.email);
    } catch (err) {
      console.error('Error en auth-guard:', err);
      window.location.href = 'login-interno.html';
    }
  }

  // Ejecutar lo antes posible en cada página interna
  document.addEventListener('DOMContentLoaded', protegerPaginaInterna);
})();
