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

  // View toggling
  toRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.style.display = 'none';
    registerView.style.display = 'flex';
    forgotView.style.display = 'none';
    document.title = 'Lluminica - Crear cuenta';
  });

  toLogin.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.style.display = 'flex';
    registerView.style.display = 'none';
    forgotView.style.display = 'none';
    document.title = 'Lluminica - Iniciar sesión';
  });

  toForgot.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.style.display = 'none';
    registerView.style.display = 'none';
    forgotView.style.display = 'flex';
    document.title = 'Lluminica - Restablecer contraseña';
  });

  forgotToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    loginView.style.display = 'flex';
    registerView.style.display = 'none';
    forgotView.style.display = 'none';
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
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginForm.querySelector('#email').value;
    const password = loginForm.querySelector('#password').value;
    const loginError = document.querySelector('#login-error');
    
    // Reset error message invisibility
    loginError.style.display = 'none';

    // Simulate authentication check
    // For demonstration, let's say test@test.com/password is the correct one
    if (email === 'test@test.com' && password === 'password') {
      alert('Inicio de sesión exitoso!');
      console.log('Login success:', { email });
    } else {
      // Show the error message
      loginError.style.display = 'block';
      console.log('Login failed:', { email, password });
    }
  });

  // Handle Register form submission
  registerForm.addEventListener('submit', (e) => {
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
      razon: document.querySelector('#reg-razon').value,
      address: document.querySelector('#reg-address').value
    };
    
    console.log('Registration attempt:', formData);
    alert('Usuario registrado con éxito (simulado).');
    
    // Switch back to login
    toLogin.click();
  });

  // Handle Forgot Password form submission
  forgotForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.querySelector('#forgot-email').value;
    
    console.log('Password reset attempt for:', email);
    alert('Se ha enviado un correo de recuperación (simulado).');
    
    // Switch back to login
    forgotToLogin.click();
  });
});
