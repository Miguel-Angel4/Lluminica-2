document.addEventListener('DOMContentLoaded', () => {
  const togglePassword = document.querySelector('#toggle-password');
  const passwordInput = document.querySelector('#password');
  const loginForm = document.querySelector('#login-form');

  // Password visibility toggle
  togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Toggle the icon
    const icon = togglePassword.querySelector('svg');
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

  // Handle form submission
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.querySelector('#email').value;
    const password = passwordInput.value;
    
    console.log('Login attempt:', { email, password });
    alert('Intento de inicio de sesión registrado en consola.');
  });
});
