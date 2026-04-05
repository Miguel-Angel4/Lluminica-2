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

  // View toggling
  toRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.style.display = 'none';
    registerView.style.display = 'flex';
    forgotView.style.display = 'none';
    dashboardView.style.display = 'none';
    document.title = 'Lluminica - Crear cuenta';
  });

  toLogin.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.style.display = 'flex';
    registerView.style.display = 'none';
    forgotView.style.display = 'none';
    dashboardView.style.display = 'none';
    document.title = 'Lluminica - Iniciar sesión';
  });

  toForgot.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.style.display = 'none';
    registerView.style.display = 'none';
    forgotView.style.display = 'flex';
    dashboardView.style.display = 'none';
    document.title = 'Lluminica - Restablecer contraseña';
  });

  forgotToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.style.display = 'flex';
    registerView.style.display = 'none';
    forgotView.style.display = 'none';
    dashboardView.style.display = 'none';
    document.title = 'Lluminica - Iniciar sesión';
  });

  // Password visibility toggle (generalized)
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', () => {
      const input = button.parentElement.querySelector('input');
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

  // Handle Login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('#email').value;
    const password = loginForm.querySelector('#password').value; // In a real app, you'd use Supabase Auth
    const loginError = document.querySelector('#login-error');
    
    // Reset error message invisibility
    loginError.style.display = 'none';

    try {
      // For demonstration, we check if the user exists in our 'profiles' table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        throw new Error('Credenciales inválidas');
      }

      // If we found the user, success!
      alert('¡Bienvenido, ' + data.nombre + '!');
      
      // Show Dashboard
      loginView.style.display = 'none';
      dashboardView.style.display = 'flex';
      document.title = 'Lluminica - Citas';
      console.log('Login success:', data);
    } catch (err) {
      // Show the error message
      loginError.style.display = 'block';
      console.error('Login error:', err.message);
    }
  });

  // Handle Register form submission
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.querySelector('#reg-password').value;
    const confirmPassword = document.querySelector('#reg-confirm-password').value;

    if (password !== confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }

    const formData = {
      nombre: document.querySelector('#reg-nombre').value,
      apellidos: document.querySelector('#reg-apellidos').value,
      telefono: document.querySelector('#reg-telefono').value,
      nif: document.querySelector('#reg-nif').value,
      email: document.querySelector('#reg-email').value,
      razon_social: document.querySelector('#reg-razon').value,
      direccion: document.querySelector('#reg-address').value
    };
    
    console.log('Registration attempt:', formData);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([formData]);

      if (error) throw error;

      alert('¡Usuario registrado con éxito en Supabase!');
      
      // Switch back to login
      toLogin.click();
    } catch (err) {
      console.error('Registration error:', err.message);
      alert('Error al registrar usuario: ' + err.message);
    }
  });

  // Handle Forgot Password form submission (Keep simulated since no Auth yet)
  forgotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.querySelector('#forgot-email').value;
    
    console.log('Password reset attempt for:', email);
    alert('Se ha enviado un correo de recuperación (simulado).');
    
    // Switch back to login
    forgotToLogin.click();
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
