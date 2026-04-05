import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

document.addEventListener('DOMContentLoaded', () => {
  const loginView = document.querySelector('#login-view');
  const registerView = document.querySelector('#register-view');
  const forgotView = document.querySelector('#forgot-view');
  
  const toRegister = document.querySelector('#to-register');
  const toLogin = document.querySelector('#to-login');
  const toForgot = document.querySelector('#to-forgot');
  const forgotToLogin = document.querySelector('#forgot-to-login');

  const loginForm = document.querySelector('#login-form');
  const registerForm = document.querySelector('#register-form');
  const forgotForm = document.querySelector('#forgot-form');
  const dashboardView = document.querySelector('#dashboard-view');

  const updatePasswordView = document.querySelector('#update-password-view');
  const updatePasswordForm = document.querySelector('#update-password-form');

  // View toggling logic extended
  const hideAllViews = () => {
    loginView.style.display = 'none';
    registerView.style.display = 'none';
    forgotView.style.display = 'none';
    updatePasswordView.style.display = 'none';
    dashboardView.style.display = 'none';
  };

  toRegister.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllViews();
    registerView.style.display = 'flex';
    document.title = 'Lluminica - Crear cuenta';
  });

  toLogin.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllViews();
    loginView.style.display = 'flex';
    document.title = 'Lluminica - Iniciar sesión';
  });

  toForgot.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllViews();
    forgotView.style.display = 'flex';
    document.title = 'Lluminica - Restablecer contraseña';
  });

  forgotToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    hideAllViews();
    loginView.style.display = 'flex';
    document.title = 'Lluminica - Iniciar sesión';
  });

  // Password visibility toggle (generalized)
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
      const input = button.parentElement.querySelector('input');
      if (!input) return;
      const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
      input.setAttribute('type', type);
      
      const icon = button.querySelector('svg');
      if (type === 'text') {
        icon.innerHTML = `
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
          <circle cx="12" cy="12" r="3"/>
        `;
      } else {
        icon.innerHTML = `
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
          <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
          <line x1="2" x2="22" y1="2" y2="22"/>
        `;
      }
    });
  });

  // Listener for Password Recovery flow
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      hideAllViews();
      updatePasswordView.style.display = 'flex';
      document.title = 'Lluminica - Crear nueva contraseña';
    }
  });

  // Handle Login form submission (Supabase Auth)
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('#email').value;
    const password = loginForm.querySelector('#password').value;
    const loginError = document.querySelector('#login-error');
    
    loginError.style.display = 'none';

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      // Fetch profile to get the name
      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre')
        .eq('email', email)
        .single();
        
      const userName = profile ? profile.nombre : 'Usuario';
      alert('¡Bienvenido, ' + userName + '!');
      
      hideAllViews();
      dashboardView.style.display = 'flex';
      document.title = 'Lluminica - Citas';
    } catch (err) {
      loginError.style.display = 'block';
      console.error('Login error:', err.message);
    }
  });

  // Handle Register form submission (Supabase Auth)
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.querySelector('#reg-email').value;
    const password = document.querySelector('#reg-password').value;
    const confirmPassword = document.querySelector('#reg-confirm-password').value;

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    try {
      // 1. Register with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) throw authError;

      // 2. Insert extra data into our custom profiles table
      const formData = {
        nombre: document.querySelector('#reg-nombre').value,
        apellidos: document.querySelector('#reg-apellidos').value,
        telefono: document.querySelector('#reg-telefono').value,
        nif: document.querySelector('#reg-nif').value,
        email: email,
        razon_social: document.querySelector('#reg-razon').value,
        direccion: document.querySelector('#reg-address').value
      };
      
      const { error: profileError } = await supabase.from('profiles').insert([formData]);
      if (profileError) console.error("Error guardando perfil:", profileError);

      alert('¡Registro exitoso! Por favor, revisa tu correo electrónico para verificar tu cuenta antes de iniciar sesión.');
      toLogin.click();
    } catch (err) {
      console.error('Registration error:', err.message);
      alert('Error: ' + err.message);
    }
  });

  // Handle Forgot Password
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.querySelector('#forgot-email').value;
    const msgElement = document.querySelector('#forgot-message');
    
    msgElement.style.color = '#111';
    msgElement.textContent = 'Enviando...';
    msgElement.style.display = 'block';

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) throw error;
      
      msgElement.style.color = '#10b981'; // Green UI success
      msgElement.textContent = 'Se te ha enviado un correo con instrucciones para recuperar tu contraseña.';
    } catch (err) {
      console.error('Reset error:', err.message);
      msgElement.style.color = '#ef4444'; // Red UI error
      msgElement.textContent = 'Error: No se pudo enviar el correo.';
    }
  });

  // Handle Update Password
  updatePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPassword = document.querySelector('#new-password').value;
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      alert('¡Tu contraseña ha sido actualizada con éxito!');
      toLogin.click();
    } catch (err) {
      console.error('Update password error:', err.message);
      alert('Error al actualizar contraseña: ' + err.message);
    }
  });

  // Dashboard Interactivity
  const tabs = document.querySelectorAll('.tab-item');
  const navItems = document.querySelectorAll('.nav-item');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // If it's the calendar tab, we don't switch yet because it's 'Próximamente'
      if (tab.id === 'tab-calendario') {
        alert('La vista de Calendario estará disponible próximamente.');
        return;
      }
      
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const label = item.querySelector('span').innerText;
      
      // If clicking something other than Citas, show a placeholder
      if (label !== 'Citas') {
        alert(`La sección de ${label} estará disponible próximamente.`);
        return;
      }

      navItems.forEach(ni => ni.classList.remove('active'));
      item.classList.add('active');
    });
  });
});
