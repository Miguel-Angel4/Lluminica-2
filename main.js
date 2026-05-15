// Verificación de sincronización: 2026-04-20 18:12
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

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
  const createAppointmentView = document.querySelector('#create-appointment-view');
  
  // Appointment creation state
  let selectedCreateAptMethod = 'Tarjeta';
  let selectedCreateAptStatus = 'Pendiente';
  let createMethodBtns, createStatusBtns, createPrecioInput, createConceptoInput, createNotasTextarea, btnVoiceNoteCreate;
  let currentDocIdToAssign = null;
  let allClientsData = [];
  let allAppointmentsData = [];
  let currentCalendarDate = new Date();
  let selectedCalendarDay = null; // {day, month, year}
  let globalCentroFilterId = localStorage.getItem('globalCentroFilterId') || null; // Global filter by center ID

  // View toggling logic extended
  const hideAllViews = () => {
    loginView.style.display = 'none';
    registerView.style.display = 'none';
    forgotView.style.display = 'none';
    updatePasswordView.style.display = 'none';
    dashboardView.style.display = 'none';
    if(createAppointmentView) createAppointmentView.style.display = 'none';
    const detView = document.querySelector('#view-detalles-cita');
    if(detView) detView.style.display = 'none';
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

  // FAB button logic for Crear Cita
  const fabAddBtn = document.querySelector('.fab-add');
  const backToDashboardBtn = document.querySelector('#back-to-dashboard');
  
  if (fabAddBtn && createAppointmentView && backToDashboardBtn) {
    fabAddBtn.addEventListener('click', () => {
      hideAllViews();
      createAppointmentView.style.display = 'flex';
      document.title = 'Lluminica - Crear cita';
      
      // Reset appointment form state
      selectedAptClient = null;
      selectedAptCentro = null;
      selectedAptProc = null;
      
      const unselected = document.getElementById('wrapper-cliente-unselected');
      const selected = document.getElementById('wrapper-cliente-selected');
      if (unselected) unselected.style.display = 'block';
      if (selected) selected.style.display = 'none';
      
      const centroText = document.getElementById('cita-centro-text');
      if (centroText) {
        centroText.textContent = 'Seleccionar...';
        centroText.style.color = '#94a3b8';
      }
      
      const procText = document.getElementById('cita-procedimiento-text');
      if (procText) {
        procText.textContent = 'Seleccionar Procedimiento';
      }
      
      loadAppointmentData();
      
      // Default selections for UI
      selectedCreateAptMethod = 'Tarjeta';
      selectedCreateAptStatus = 'Pendiente';
      if (createPrecioInput) createPrecioInput.value = '0.00';
      if (createConceptoInput) createConceptoInput.value = '';
      if (createNotasTextarea) createNotasTextarea.value = '';
      updateCreateSelectionUI();
    });

    backToDashboardBtn.addEventListener('click', () => {
      hideAllViews();
      dashboardView.style.display = 'flex';
      document.title = 'Lluminica - Citas';
    });
  }

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
      loadAppointments(); // Ensure appointments are loaded on login
      dbLoadPhotos(); // Ensure photos are loaded on login
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
      
      // Explicitly switch view instead of relying on a hidden element's click
      hideAllViews();
      loginView.style.display = 'flex';
      document.title = 'Lluminica - Iniciar sesión';
      
      // Clear the recovery hash from the URL so reloading doesn't trigger it again
      window.history.replaceState(null, '', window.location.pathname);
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
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const citasContainer = document.getElementById('citas-container');
      const calendarioView = document.getElementById('calendario-view');
      const emptyState = document.getElementById('citas-empty-state');

      if (tab.id === 'tab-calendario') {
        if (citasContainer) citasContainer.style.display = 'none';
        if (calendarioView) calendarioView.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        renderCalendar();
      } else {
        if (citasContainer) citasContainer.style.display = (allAppointmentsData.length > 0) ? 'flex' : 'none';
        if (calendarioView) calendarioView.style.display = 'none';
        if (emptyState) emptyState.style.display = (allAppointmentsData.length === 0) ? 'flex' : 'none';
        const dayApts = document.getElementById('calendar-day-appointments');
        if (dayApts) dayApts.style.display = 'none';
      }
    });
  });

  // Calendar Navigation
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      const dayApts = document.getElementById('calendar-day-appointments');
      if (dayApts) dayApts.style.display = 'none';
      renderCalendar();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      const dayApts = document.getElementById('calendar-day-appointments');
      if (dayApts) dayApts.style.display = 'none';
      renderCalendar();
    });
  }

  function renderCalendar() {
    const monthYearLabel = document.getElementById('calendar-month-year');
    const calendarDays = document.getElementById('calendar-days');
    if (!monthYearLabel || !calendarDays) return;

    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    monthYearLabel.textContent = `${months[month]} ${year}`;

    // Clear days
    calendarDays.innerHTML = '';

    // First day of month
    const firstDay = new Date(year, month, 1).getDay();
    // Adjust for Monday start (0=Sun, 1=Mon... -> 0=Mon, 6=Sun)
    let dayOffset = firstDay === 0 ? 6 : firstDay - 1;

    // Days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Padding
    for (let i = 0; i < dayOffset; i++) {
      const empty = document.createElement('div');
      calendarDays.appendChild(empty);
    }

    // Days
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const dayEl = document.createElement('div');
      dayEl.style.height = '40px';
      dayEl.style.display = 'flex';
      dayEl.style.flexDirection = 'column';
      dayEl.style.alignItems = 'center';
      dayEl.style.justifyContent = 'center';
      dayEl.style.fontSize = '0.9rem';
      dayEl.style.fontWeight = '600';
      dayEl.style.borderRadius = '10px';
      dayEl.style.cursor = 'pointer';
      dayEl.style.position = 'relative';
      dayEl.textContent = d;

      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      
      // Check for appointments on this day
      const dayAppointments = allAppointmentsData.filter(apt => {
        const aptDate = new Date(apt.created_at);
        return aptDate.getFullYear() === year && aptDate.getMonth() === month && aptDate.getDate() === d;
      });

      if (dayAppointments.length > 0) {
        dayEl.style.color = '#00bcd4';
        const dot = document.createElement('div');
        dot.style.width = '4px';
        dot.style.height = '4px';
        dot.style.background = '#00bcd4';
        dot.style.borderRadius = '50%';
        dot.style.position = 'absolute';
        dot.style.bottom = '5px';
        dayEl.appendChild(dot);
      } else {
        dayEl.style.color = '#1e293b';
      }

      if (selectedCalendarDay && selectedCalendarDay.year === year && selectedCalendarDay.month === month && selectedCalendarDay.day === d) {
        dayEl.style.background = '#00bcd4';
        dayEl.style.color = 'white';
        const dot = dayEl.querySelector('div');
        if (dot) dot.style.background = 'white';
      } else if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === d) {
        dayEl.style.background = '#e0f7fa';
        dayEl.style.border = '1px solid #00bcd4';
      }

      dayEl.onclick = () => {
        selectedCalendarDay = { day: d, month: month, year: year };
        renderCalendar(); // Re-render to show selection
        showDayAppointments(d, month, year, dayAppointments);
      };

      calendarDays.appendChild(dayEl);
    }
  }

  function showDayAppointments(day, month, year, appointments) {
    const container = document.getElementById('calendar-day-appointments');
    const list = document.getElementById('calendar-appointments-list');
    const label = document.getElementById('selected-day-label');
    if (!container || !list || !label) return;

    if (appointments.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    label.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      Citas para el ${day}/${month + 1}/${year}
    `;

    list.innerHTML = appointments.map(apt => {
      const date = new Date(apt.created_at);
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      const clientName = apt.clients ? apt.clients.nombre_completo : 'Cliente';
      
      return `
        <div class="calendar-apt-item" data-id="${apt.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; background: #f8fafc; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 1px solid #f1f5f9;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <span style="color: #00bcd4; font-weight: 700; font-size: 0.95rem;">${timeStr}</span>
            <span style="color: #1e293b; font-weight: 600; font-size: 0.95rem;">${clientName}</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.calendar-apt-item').forEach(item => {
      item.onclick = () => {
        showAppointmentDetails(item.dataset.id);
      };
      item.onmouseenter = () => {
        item.style.background = '#f1f5f9';
        item.style.borderColor = '#e2e8f0';
      };
      item.onmouseleave = () => {
        item.style.background = '#f8fafc';
        item.style.borderColor = '#f1f5f9';
      };
    });

    // Scroll container into view if it was hidden
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const menuItems = document.querySelectorAll('.menu-item');

  const hideAllDashboardViews = () => {
    const views = ['#view-citas', '#view-galeria', '#view-clientes', '#view-menu', '#view-documentos', '#view-subir-documento', '#view-asignar-documento', '#view-productos', '#view-crear-producto', '#view-editar-producto', '#view-procedimientos', '#view-crear-procedimiento', '#view-centros', '#view-crear-centro', '#view-reportes', '#view-crear-reporte', '#view-detalles-cita', '#view-perfil'];
    views.forEach(selector => {
      const v = document.querySelector(selector);
      if (v) v.style.display = 'none';
    });
    const filterView = document.querySelector('#view-global-centro-filter');
    if (filterView) filterView.style.display = 'none';
  };

  const switchToView = (label) => {
    navItems.forEach(ni => ni.classList.remove('active'));
    
    // Find matching nav item and activate it
    navItems.forEach(ni => {
      const navLabel = ni.querySelector('span').innerText.trim();
      if (navLabel === label.trim()) ni.classList.add('active');
    });

    hideAllDashboardViews();

    if (label === 'Citas') {
      const view = document.querySelector('#view-citas');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Citas';
      loadAppointments();
    } else if (label === 'Galería') {
      const view = document.querySelector('#view-galeria');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Galería';
      dbLoadPhotos();
    } else if (label === 'Clientes') {
      const view = document.querySelector('#view-clientes');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Clientes';
      loadClientes();
    } else if (label === 'Menú') {
      const view = document.querySelector('#view-menu');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Menú';
      loadUserProfile();
    } else if (label === 'Documentos') {
      const view = document.querySelector('#view-documentos');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Documentos';
      loadDocumentos();
    } else if (label === 'Subir documento') {
      const view = document.querySelector('#view-subir-documento');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Subir documento';
    } else if (label === 'Asignar Documento') {
      const view = document.querySelector('#view-asignar-documento');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Asignar Documento';
    } else if (label === 'Productos') {
      const view = document.querySelector('#view-productos');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Productos';
      loadProductos();
    } else if (label === 'Crear Producto') {
      const view = document.querySelector('#view-crear-producto');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Crear Producto';
    } else if (label === 'Editar Producto') {
      const view = document.querySelector('#view-editar-producto');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Editar Producto';
    } else if (label === 'Procedimientos') {
      const view = document.querySelector('#view-procedimientos');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Procedimientos';
      loadProcedimientos();
    } else if (label === 'Crear Procedimiento') {
      const view = document.querySelector('#view-crear-procedimiento');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Crear Procedimiento';
    } else if (label === 'Centros') {
      const view = document.querySelector('#view-centros');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Centros';
      loadCentros();
    } else if (label === 'Crear Centro') {
      const view = document.querySelector('#view-crear-centro');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Crear Centro';
    } else if (label === 'Reportes') {
      const view = document.querySelector('#view-reportes');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Reportes';
      loadReportes();
    } else if (label === 'Crear Reporte') {
      const view = document.querySelector('#view-crear-reporte');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Nuevo Reporte';
      document.title = 'Lluminica - Perfil';
      loadFullUserProfile();
    } else if (label === 'FiltroCentro') {
      const view = document.querySelector('#view-global-centro-filter');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Filtro por centro';
      renderGlobalCentroFilter();
    } else {
      alert(`La sección de ${label} estará disponible próximamente.`);
    }
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const label = item.querySelector('span').innerText.trim();
      switchToView(label);
    });
  });

  const backFromDocs = document.getElementById('back-from-docs');
  if (backFromDocs) {
    backFromDocs.addEventListener('click', () => {
      switchToView('Menú');
    });
  }

  const btnOpenUploadDoc = document.getElementById('btn-open-upload-doc');
  if (btnOpenUploadDoc) {
    btnOpenUploadDoc.addEventListener('click', () => {
      switchToView('Subir documento');
    });
  }

  const backFromProductos = document.getElementById('back-from-productos');
  if (backFromProductos) {
    backFromProductos.addEventListener('click', () => {
      switchToView('Menú');
    });
  }

  const btnOpenAddProduct = document.getElementById('btn-open-add-product');
  if (btnOpenAddProduct) {
    btnOpenAddProduct.addEventListener('click', () => {
      switchToView('Crear Producto');
    });
  }

  const backFromCrearProducto = document.getElementById('back-from-crear-producto');
  if (backFromCrearProducto) {
    backFromCrearProducto.addEventListener('click', () => {
      switchToView('Productos');
    });
  }

  const backToDocsList = document.getElementById('back-to-docs-list');
  if (backToDocsList) {
    backToDocsList.addEventListener('click', () => {
      switchToView('Documentos');
    });
  }

  const backFromAssignDoc = document.getElementById('back-from-assign-doc');
  if (backFromAssignDoc) {
    backFromAssignDoc.addEventListener('click', () => {
      switchToView('Documentos');
    });
  }

  const btnDoUploadDoc = document.getElementById('btn-do-upload-doc');
  const docsListContainer = document.getElementById('docs-list-container');
  const btnTriggerDocInput = document.getElementById('btn-trigger-doc-input');
  const inputUploadDoc = document.getElementById('input-upload-doc');
  let tempDocs = []; // Local storage for the session

  if (btnTriggerDocInput && inputUploadDoc) {
    btnTriggerDocInput.addEventListener('click', () => {
      inputUploadDoc.click();
    });
    
    inputUploadDoc.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        btnTriggerDocInput.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          ${file.name}
        `;
        btnDoUploadDoc.style.background = '#00bcd4';
      }
    });
  }

  if (btnDoUploadDoc) {
    btnDoUploadDoc.addEventListener('click', async () => {
      const file = inputUploadDoc.files[0];
      if (!file) {
        alert('Por favor, selecciona un documento primero.');
        return;
      }

      btnDoUploadDoc.disabled = true;
      btnDoUploadDoc.textContent = 'Subiendo...';

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No hay sesión activa');

        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Content = e.target.result;
          try {
            const { error } = await supabase
              .from('documentos')
              .insert({
                nombre: file.name,
                user_id: user.id,
                contenido_base64: base64Content
              });

            if (error) throw error;

            // Reset and return
            inputUploadDoc.value = '';
            btnTriggerDocInput.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
              Seleccionar un documento
            `;
            btnDoUploadDoc.style.background = '#94a3b8';
            
            switchToView('Documentos');
          } catch (err) {
            alert('Error al guardar en base de datos: ' + err.message);
          } finally {
            btnDoUploadDoc.disabled = false;
            btnDoUploadDoc.textContent = 'Subir';
          }
        };
        reader.onerror = () => {
          alert('Error al leer el archivo.');
          btnDoUploadDoc.disabled = false;
          btnDoUploadDoc.textContent = 'Subir';
        };
        reader.readAsDataURL(file);
      } catch (err) {
        alert('Error: ' + err.message);
        btnDoUploadDoc.disabled = false;
        btnDoUploadDoc.textContent = 'Subir';
      }
    });
  }

  async function loadDocumentos() {
    if (!docsListContainer) return;
    
    try {
      let query = supabase
        .from('documentos')
        .select(`
          *,
          clients!inner (
            nombre_completo,
            centro_id
          )
        `);

      if (globalCentroFilterId) {
        query = query.eq('clients.centro_id', globalCentroFilterId);
      } else {
        // If no filter, allow docs with no client (optional choice, but let's keep it visible)
        query = supabase
          .from('documentos')
          .select(`
            *,
            clients (
              nombre_completo,
              centro_id
            )
          `);
      }

      const { data: docs, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      renderDocumentos(docs);
    } catch (err) {
      console.error('Error loading documentos:', err.message);
    }
  }

  window.openAssignDoc = (docId) => {
    currentDocIdToAssign = docId;
    switchToView('Asignar Documento');
    renderAssignDocClients();
  };

  async function renderAssignDocClients() {
    const listContainer = document.getElementById('assign-doc-clients-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<p style="text-align: center; color: #64748b;">Cargando clientes...</p>';

    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('nombre_completo', { ascending: true });

      if (error) throw error;

      if (!clients || clients.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: #64748b;">No hay clientes registrados.</p>';
        return;
      }

      listContainer.innerHTML = clients.map(client => `
        <div class="client-assign-card" onclick="assignDocToClient('${client.id}')" style="background: white; border-radius: 12px; padding: 1rem; display: flex; align-items: center; gap: 1rem; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
          <div style="background: #06b6d4; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: #1e293b; font-size: 1rem;">${client.nombre_completo}</div>
            <div style="font-size: 0.85rem; color: #94a3b8; font-family: monospace;">${client.id.substring(0, 8)}...</div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      `).join('');
    } catch (err) {
      listContainer.innerHTML = `<p style="text-align: center; color: #ef4444;">Error: ${err.message}</p>`;
    }
  }

  window.assignDocToClient = async (clientId) => {
    if (!currentDocIdToAssign) return;

    try {
      const { error } = await supabase
        .from('documentos')
        .update({ client_id: clientId })
        .eq('id', currentDocIdToAssign);

      if (error) throw error;

      currentDocIdToAssign = null;
      switchToView('Documentos');
      await loadDocumentos();
    } catch (err) {
      alert('Error al asignar documento: ' + err.message);
    }
  };
  function renderDocumentos(docs) {
    if (!docsListContainer) return;

    docsListContainer.innerHTML = docs.map(doc => {
      const clientName = doc.clients ? doc.clients.nombre_completo : null;
      
      return `
        <div class="doc-card" style="background: white; border-radius: 12px; padding: 1rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <div class="doc-info" onclick="previewDocument('${doc.id}')" style="display: flex; align-items: center; gap: 1rem; cursor: pointer; flex: 1;">
            <div class="doc-icon" style="color: #06b6d4;">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div class="doc-name" style="font-weight: 600; color: #1e293b; font-size: 0.95rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${doc.nombre}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${clientName ? `
              <div style="background: #f1f5f9; color: #64748b; padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.85rem; font-weight: 700;">${clientName}</div>
            ` : `
              <button class="btn-asignar" onclick="openAssignDoc('${doc.id}')" style="background: #06b6d4; color: white; border: none; border-radius: 6px; padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;">Asignar</button>
            `}
            <button onclick="deleteDocument('${doc.id}')" style="background: transparent; border: none; cursor: pointer; color: #ef4444; display: flex; align-items: center; justify-content: center; padding: 0.5rem; border-radius: 6px;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='transparent'">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  window.deleteDocument = async (docId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este documento?')) return;
    try {
      const { error } = await supabase.from('documentos').delete().eq('id', docId);
      if (error) throw error;
      await loadDocumentos();
    } catch (err) {
      alert('Error al borrar documento: ' + err.message);
    }
  };

  window.previewDocument = async (docId) => {
    try {
      const { data, error } = await supabase
        .from('documentos')
        .select('nombre, contenido_base64')
        .eq('id', docId)
        .single();
        
      if (error) throw error;

      if (!data.contenido_base64) {
        alert('Este documento no tiene contenido guardado (se subió antes de habilitar las vistas previas).');
        return;
      }

      const modal = document.getElementById('preview-documento-modal');
      const title = document.getElementById('preview-documento-title');
      const container = document.getElementById('preview-documento-container');

      if(title) title.textContent = data.nombre;
      if(container) {
        container.innerHTML = '';
        const isImage = data.contenido_base64.startsWith('data:image/');
        
        if (isImage) {
          container.innerHTML = `<img src="${data.contenido_base64}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
        } else {
          container.innerHTML = `<iframe src="${data.contenido_base64}" style="width: 100%; height: 100%; border: none;"></iframe>`;
        }
      }

      if(modal) modal.style.display = 'flex';
    } catch (err) {
      alert('Error al cargar la vista previa: ' + err.message);
    }
  };

  // Global management list navigation handler
  const managementList = document.querySelector('.management-list-box');
  if (managementList) {
    managementList.addEventListener('click', (e) => {
      const item = e.target.closest('.menu-item');
      if (!item) return;

      const labelElement = item.querySelector('.item-text');
      if (!labelElement) return;
      
      const label = labelElement.innerText.trim();
      
      console.log('Navegando a:', label); // Debug log

      if (['Citas', 'Galería', 'Clientes', 'Menú', 'Documentos', 'Productos', 'Procedimientos', 'Centros', 'Reportes'].includes(label)) {
        switchToView(label);
      } else {
        alert(`La sección de ${label} estará disponible próximamente.`);
      }
    });
  }

  // Also handle the profile card which is outside management list
  const btnConfigPerfil = document.getElementById('btn-configurar-perfil');
  if (btnConfigPerfil) {
    btnConfigPerfil.addEventListener('click', (e) => {
      e.preventDefault();
      switchToView('Perfil');
    });
  }

  const backFromPerfil = document.getElementById('back-from-perfil');
  if (backFromPerfil) {
    backFromPerfil.addEventListener('click', () => {
      switchToView('Menú');
    });
  }

  // Accordion Logic
  const togglePersonal = document.getElementById('toggle-personal');
  const bodyPersonal = document.getElementById('body-personal');
  const chevronPersonal = document.getElementById('chevron-personal');
  
  if (togglePersonal && bodyPersonal && chevronPersonal) {
    togglePersonal.addEventListener('click', () => {
      const isHidden = bodyPersonal.style.display === 'none';
      bodyPersonal.style.display = isHidden ? 'block' : 'none';
      chevronPersonal.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    });
  }

  const toggleFacturacion = document.getElementById('toggle-facturacion');
  const bodyFacturacion = document.getElementById('body-facturacion');
  const chevronFacturacion = document.getElementById('chevron-facturacion');

  if (toggleFacturacion && bodyFacturacion && chevronFacturacion) {
    toggleFacturacion.addEventListener('click', () => {
      const isHidden = bodyFacturacion.style.display === 'none';
      bodyFacturacion.style.display = isHidden ? 'block' : 'none';
      chevronFacturacion.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    });
  }

  async function loadFullUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Always set email from the auth user object first, before any potential errors
      const emailField = document.getElementById('perfil-email');
      if (emailField) {
        emailField.value = user.email || '';
        console.log("Setting email field to:", user.email);
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single();

      // We don't throw if error is "not found" to allow setting fields to empty
      if (profile) {
        document.getElementById('perfil-nombre').value = profile.nombre || '';
        document.getElementById('perfil-apellidos').value = profile.apellidos || '';
        document.getElementById('perfil-telefono').value = profile.telefono || '';
        document.getElementById('perfil-nif').value = profile.nif || '';
        document.getElementById('perfil-razon').value = profile.razon_social || '';
        document.getElementById('perfil-direccion').value = profile.direccion || '';
      }
    } catch (err) {
      console.error('Error loading full profile:', err.message);
    }
  }

  const btnActualizarPerfil = document.getElementById('btn-actualizar-perfil');
  if (btnActualizarPerfil) {
    btnActualizarPerfil.addEventListener('click', async () => {
      btnActualizarPerfil.disabled = true;
      btnActualizarPerfil.textContent = 'Actualizando...';

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No hay sesión activa');

        const updatedData = {
          nombre: document.getElementById('perfil-nombre').value,
          apellidos: document.getElementById('perfil-apellidos').value,
          telefono: document.getElementById('perfil-telefono').value,
          nif: document.getElementById('perfil-nif').value,
          razon_social: document.getElementById('perfil-razon').value,
          direccion: document.getElementById('perfil-direccion').value
        };

        const { error } = await supabase
          .from('profiles')
          .upsert({ ...updatedData, email: user.email }, { onConflict: 'email' });

        if (error) throw error;

        alert('Perfil actualizado correctamente.');
        loadUserProfile(); // Refresh the menu card name
      } catch (err) {
        alert('Error al actualizar perfil: ' + err.message);
      } finally {
        btnActualizarPerfil.disabled = false;
        btnActualizarPerfil.textContent = 'Actualizar Perfil';
      }
    });
  }

  const btnEliminarCuenta = document.getElementById('btn-eliminar-cuenta');
  if (btnEliminarCuenta) {
    btnEliminarCuenta.addEventListener('click', async () => {
      const confirmDelete = confirm('¿ESTÁS SEGURO? Esta acción es irreversible y eliminará todos tus datos, citas, clientes y fotos permanentemente.');
      if (!confirmDelete) return;

      const secondConfirm = confirm('Por favor, confirma una última vez que deseas eliminar tu cuenta de Lluminica.');
      if (!secondConfirm) return;

      btnEliminarCuenta.disabled = true;
      btnEliminarCuenta.textContent = 'Eliminando...';

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Note: For a real app, you'd usually call an edge function to delete auth user and cascades.
        // Here we'll just sign out after a simulated cleanup or profile deletion.
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('email', user.email);

        if (profileError) throw profileError;

        await supabase.auth.signOut();
        location.reload();
      } catch (err) {
        alert('Error al eliminar cuenta: ' + err.message);
        btnEliminarCuenta.disabled = false;
        btnEliminarCuenta.textContent = 'Eliminar Cuenta';
      }
    });
  }

  async function loadUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre, apellidos')
        .eq('email', user.email)
        .single();

      const fullName = profile ? `${profile.nombre} ${profile.apellidos}` : user.email.split('@')[0];
      
      const menuUserName = document.getElementById('menu-user-name');
      const menuUserEmail = document.getElementById('menu-user-email');
      
      if (menuUserName) menuUserName.textContent = fullName;
      if (menuUserEmail) menuUserEmail.textContent = user.email;
    } catch (err) {
      console.error('Error loading user profile for menu:', err.message);
    }
  }

  // Image Context (gallery or product or appointment)
  let currentImageContext = 'gallery';
  let currentAptId = null;
  let currentAptClientId = null; // Track current appointment's client
  let currentAptPhotos = {}; // Store photos per appointment ID
  let internalSessionPhotos = []; // Buffer for taken photos
  let allPhotosData = []; // Store all photos from DB
  let currentProductImageData = null;
  let allProductData = [];
  let allProcData = [];

  async function dbSavePhoto(dataUrl, client_id = null, appointment_id = null, tag = 'Sin etiqueta', id = null) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (id) {
        // ACTUALIZAR registro existente
        const { error } = await supabase
          .from('photos')
          .update({
            client_id: client_id,
            appointment_id: appointment_id,
            tag: tag
          })
          .eq('id', id);
        if (error) throw error;
        console.log('Foto actualizada con éxito:', id);
      } else {
        // INSERTAR nuevo registro
        const { error } = await supabase
          .from('photos')
          .insert([{
            data_url: dataUrl,
            client_id: client_id,
            appointment_id: appointment_id,
            tag: tag
          }]);
        if (error) throw error;
        console.log('Nueva foto guardada con éxito');
      }
      await dbLoadPhotos();
    } catch (err) {
      console.error('Error al guardar/actualizar foto en DB:', err.message);
    }
  }

  async function dbDeletePhoto(photoId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta foto permanentemente?')) return;
    try {
      const { error } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId);
      if (error) throw error;
      console.log('Foto eliminada:', photoId);
      await dbLoadPhotos();
    } catch (err) {
      alert('Error al eliminar la foto: ' + err.message);
    }
  }

  async function dbLoadPhotos(filterType = null, filterValue = null) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let query = supabase
        .from('photos')
        .select(`
          *,
          appointments (
            id,
            procedure_id,
            centro_id,
            created_at,
            procedimientos (nombre),
            centros (nombre)
          ),
          clients (
            nombre_completo
          )
        `)
        .order('created_at', { ascending: false });

      if (globalCentroFilterId) {
        query = query.eq('appointments.centro_id', globalCentroFilterId);
      }

      // Apply filtering if provided
      if (filterType && filterValue) {
        if (filterType === 'Cliente') {
          query = query.eq('client_id', filterValue);
        } else if (filterType === 'Procedimiento') {
          // This requires a bit more complex filtering since it's nested
          // But Supabase allows filtering on joined tables
          query = query.eq('appointments.procedure_id', filterValue);
        } else if (filterType === 'Centro') {
          query = query.eq('appointments.centro_id', filterValue);
        } else if (filterType === 'Fecha') {
          // Filter by date (YYYY-MM-DD)
          query = query.gte('created_at', `${filterValue}T00:00:00`).lte('created_at', `${filterValue}T23:59:59`);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Clean local session variables
      allPhotosData = data;
      internalSessionPhotos.length = 0;
      currentAptPhotos = {};
      
      const galeriaContent = document.querySelector('.galeria-content');
      if (galeriaContent) {
        galeriaContent.innerHTML = '';
        // Filter out photos where the joined filter didn't match (Supabase returns null for filtered joins)
        const filteredData = data.filter(p => {
          if (!filterType || !filterValue) return true;
          if (filterType === 'Procedimiento') return p.appointments && p.appointments.procedure_id === filterValue;
          if (filterType === 'Centro') return p.appointments && p.appointments.centro_id === filterValue;
          return true;
        });

        if (filteredData.length > 0) {
          galeriaContent.classList.remove('empty-state-galeria');
          galeriaContent.style.display = 'grid';
          galeriaContent.style.gridTemplateColumns = 'repeat(3, 1fr)';
          galeriaContent.style.gap = '0.5rem';
          galeriaContent.style.padding = '1rem';
          galeriaContent.style.paddingBottom = '100px'; // Extra space for FAB
        } else {
          galeriaContent.classList.add('empty-state-galeria');
          galeriaContent.style.display = 'flex';
          galeriaContent.innerHTML = `
            <div class="img-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
            <h3>No se encontraron imágenes</h3>
            <p>Prueba con otro filtro o sube nuevas imágenes</p>
          `;
          return;
        }

        filteredData.forEach(photo => {
          if (photo.appointment_id) {
            if (!currentAptPhotos[photo.appointment_id]) {
              currentAptPhotos[photo.appointment_id] = [];
            }
            currentAptPhotos[photo.appointment_id].push(photo.data_url);
          }
          
          if (photo.client_id) {
            // Add to main gallery wall
            const imgContainer = document.createElement('div');
            imgContainer.style.width = '100%';
            imgContainer.style.height = '0';
            imgContainer.style.paddingBottom = '100%';
            imgContainer.style.position = 'relative';
            imgContainer.style.borderRadius = '12px';
            imgContainer.style.overflow = 'hidden';
            imgContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            imgContainer.style.backgroundColor = '#f1f5f9';

            const img = document.createElement('img');
            img.src = photo.data_url;
            img.style.position = 'absolute';
            img.style.top = '0';
            img.style.left = '0';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';

            const btnDel = document.createElement('button');
            btnDel.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
            btnDel.style.position = 'absolute';
            btnDel.style.top = '8px';
            btnDel.style.right = '8px';
            btnDel.style.background = 'rgba(239, 68, 68, 0.9)';
            btnDel.style.border = 'none';
            btnDel.style.borderRadius = '8px';
            btnDel.style.padding = '6px';
            btnDel.style.cursor = 'pointer';
            btnDel.style.display = 'flex';
            btnDel.style.alignItems = 'center';
            btnDel.style.justifyContent = 'center';
            btnDel.style.zIndex = '10';
            btnDel.onclick = (e) => {
              e.stopPropagation();
              dbDeletePhoto(photo.id);
            };

            // Tag overlay (bottom-left)
            const tagLabel = document.createElement('div');
            tagLabel.textContent = photo.tag || 'Sin etiqueta';
            tagLabel.style.position = 'absolute';
            tagLabel.style.bottom = '8px';
            tagLabel.style.left = '8px';
            tagLabel.style.background = 'rgba(15, 23, 42, 0.6)';
            tagLabel.style.backdropFilter = 'blur(4px)';
            tagLabel.style.color = 'white';
            tagLabel.style.padding = '4px 10px';
            tagLabel.style.borderRadius = '6px';
            tagLabel.style.fontSize = '0.75rem';
            tagLabel.style.fontWeight = '600';
            tagLabel.style.zIndex = '5';
            
            imgContainer.appendChild(img);
            imgContainer.appendChild(btnDel);
            imgContainer.appendChild(tagLabel);
            galeriaContent.appendChild(imgContainer);
          } else if (!photo.appointment_id) {
            // If no client and no appointment, it goes to the internal gallery buffer
            internalSessionPhotos.push(photo.data_url);
          }
        });

      if (typeof renderInternalGallery === 'function') renderInternalGallery();
      if (typeof renderAptPhotos === 'function') renderAptPhotos();
    }
    } catch (err) {
      console.error('Error al cargar fotos:', err.message);
    }
  }

  const productPreviewArea = document.getElementById('product-image-preview');
  const btnProductImgCamera = document.getElementById('product-img-btn-camera');
  const btnProductImgIcons = document.getElementById('product-img-btn-icons');
  const productIconModal = document.getElementById('product-icon-modal');
  const btnCloseIconModal = document.getElementById('btn-close-icon-modal');

  const updateProductImagePreview = (content, isIcon = false) => {
    if (!productPreviewArea) return;
    currentProductImageData = content;
    if (isIcon) {
      productPreviewArea.innerHTML = content;
      productPreviewArea.style.background = '#f1f5f9';
      // Ensure the SVG inside fills nicely
      const svg = productPreviewArea.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', '60');
        svg.setAttribute('height', '60');
        svg.setAttribute('stroke', '#00bcd4');
      }
    } else {
      productPreviewArea.innerHTML = `<img src="${content}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />`;
    }
  };

  const editProductPreviewArea = document.getElementById('edit-product-image-preview');
  let currentEditProductImageData = null;
  let editingProductId = null;

  const updateEditProductImagePreview = (content, isIcon = false) => {
    if (!editProductPreviewArea) return;
    currentEditProductImageData = content;
    if (isIcon) {
      editProductPreviewArea.innerHTML = content;
      editProductPreviewArea.style.background = '#f1f5f9';
      const svg = editProductPreviewArea.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', '60');
        svg.setAttribute('height', '60');
        svg.setAttribute('stroke', '#00bcd4');
      }
    } else {
      editProductPreviewArea.innerHTML = `<img src="${content}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />`;
    }
  };

  if (btnProductImgCamera) {
    btnProductImgCamera.addEventListener('click', () => {
      currentImageContext = 'product';
      if (imageSourceModal) {
        // We ensure Camera button allows both capturing AND gallery since the other button is now for icons
        imageSourceModal.style.display = 'flex';
      }
    });
  }

  let currentIconTarget = 'product'; // 'product' or 'procedure'

  if (btnProductImgIcons && productIconModal) {
    btnProductImgIcons.addEventListener('click', () => {
      currentIconTarget = 'product';
      productIconModal.style.display = 'flex';
    });
  }

  const btnEditProductImgCamera = document.getElementById('edit-product-img-btn-camera');
  if (btnEditProductImgCamera) {
    btnEditProductImgCamera.addEventListener('click', () => {
      currentImageContext = 'edit-product';
      if (imageSourceModal) {
        imageSourceModal.style.display = 'flex';
      }
    });
  }

  const btnEditProductImgIcons = document.getElementById('edit-product-img-btn-icons');
  if (btnEditProductImgIcons && productIconModal) {
    btnEditProductImgIcons.addEventListener('click', () => {
      currentIconTarget = 'edit-product';
      productIconModal.style.display = 'flex';
    });
  }

  const btnProcImgIcons = document.getElementById('proc-img-btn-icons');
  if (btnProcImgIcons && productIconModal) {
    btnProcImgIcons.addEventListener('click', () => {
      currentIconTarget = 'procedure';
      productIconModal.style.display = 'flex';
    });
  }

  const procIconPreview = document.getElementById('proc-icon-preview');
  const updateProcIconPreview = (svgHtml) => {
    if (!procIconPreview) return;
    procIconPreview.innerHTML = svgHtml;
    procIconPreview.style.background = '#f1f5f9';
    const svg = procIconPreview.querySelector('svg');
    if (svg) {
      svg.setAttribute('width', '60');
      svg.setAttribute('height', '60');
      svg.setAttribute('stroke', '#00bcd4');
    }
  };

  // Icon selection logic
  const iconOptions = document.querySelectorAll('.icon-option');
  iconOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      iconOptions.forEach(o => {
        o.style.background = 'none';
        o.style.border = '2px solid #00bcd4';
        o.style.color = '#00bcd4';
      });
      opt.style.background = '#00bcd4';
      opt.style.color = 'white';
      
      const svgHtml = opt.querySelector('svg').outerHTML;
      if (currentIconTarget === 'product') {
        updateProductImagePreview(svgHtml, true);
      } else if (currentIconTarget === 'edit-product') {
        updateEditProductImagePreview(svgHtml, true);
      } else {
        updateProcIconPreview(svgHtml);
        currentProcIconData = svgHtml; // Store it
      }
    });
  });

  if (btnCloseIconModal && productIconModal) {
    btnCloseIconModal.addEventListener('click', () => {
      productIconModal.style.display = 'none';
    });

    productIconModal.addEventListener('click', (e) => {
      if (e.target === productIconModal) {
        productIconModal.style.display = 'none';
      }
    });
  }

  // Modal logic for Galeria Camera FAB
  const galeriaFab = document.querySelector('.fab-camera');
  const imageSourceModal = document.querySelector('#image-source-modal');
  const btnCameraAction = document.querySelector('#btn-camera-action');
  const btnGalleryAction = document.querySelector('#btn-gallery-action');
  const btnCancelAction = document.querySelector('#btn-cancel-action');
  const cameraInput = document.querySelector('#camera-input');
  const galleryInput = document.querySelector('#gallery-input');

  if (galeriaFab && imageSourceModal) {
    galeriaFab.addEventListener('click', () => {
      currentImageContext = 'gallery';
      imageSourceModal.style.display = 'flex';
    });

    btnCancelAction.addEventListener('click', () => {
      imageSourceModal.style.display = 'none';
    });

    // Close modal if clicking outside the dialog
    imageSourceModal.addEventListener('click', (e) => {
      if (e.target === imageSourceModal) {
        imageSourceModal.style.display = 'none';
      }
    });

    const webcamView = document.getElementById('webcam-view');
    const webcamVideo = document.getElementById('webcam-video');
    const webcamCanvas = document.getElementById('webcam-canvas');
    const webcamCaptureBtn = document.getElementById('webcam-capture');
    const webcamCloseBtn = document.getElementById('webcam-close');

    const stopWebcam = () => {
      if (webcamVideo && webcamVideo.srcObject) {
        webcamVideo.srcObject.getTracks().forEach(track => track.stop());
        webcamVideo.srcObject = null;
      }
      if (webcamView) webcamView.style.display = 'none';
    };

    const startWebcam = async () => {
      imageSourceModal.style.display = 'none';
      if (webcamView) webcamView.style.display = 'block';
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamVideo.srcObject = stream;
      } catch (err) {
        alert('Error al acceder a la cámara en el PC: ' + err.message);
        if (webcamView) webcamView.style.display = 'none';
      }
    };

    if (webcamCloseBtn) {
      webcamCloseBtn.addEventListener('click', stopWebcam);
    }


    const internalGalleryModal = document.getElementById('internal-gallery-modal');
    const internalGalleryGrid = document.getElementById('internal-gallery-grid');
    const closeInternalGalleryBtn = document.getElementById('close-internal-gallery');

    const selectedInternalPhotos = new Set();
    const internalGalleryActionBar = document.getElementById('internal-gallery-action-bar');
    const addToMainGalleryBtn = document.getElementById('add-to-main-gallery-btn');
    const galeriaContent = document.querySelector('.galeria-content');

    const updateActionBar = () => {
      if (!internalGalleryActionBar || !addToMainGalleryBtn) return;
      if (selectedInternalPhotos.size > 0) {
        internalGalleryActionBar.style.display = 'flex';
        addToMainGalleryBtn.textContent = `Añadir (${selectedInternalPhotos.size})`;
      } else {
        internalGalleryActionBar.style.display = 'none';
      }
    };

    const wizardProcSelect = document.getElementById('wizard-proc-select');
    const wizardProcDropdown = document.getElementById('wizard-proc-dropdown');
    const wizardAptSelect = document.getElementById('wizard-apt-select');
    const wizardAptDropdown = document.getElementById('wizard-apt-dropdown');

    const validateWizard = () => {
      const clientId = wizardClientSelect.dataset.clientId;
      const procId = wizardProcSelect.dataset.procId;
      const aptId = wizardAptSelect.dataset.aptId;

      if (clientId && procId && aptId) {
        wizardSaveBtn.style.background = '#06b6d4';
        wizardSaveBtn.style.color = 'white';
        wizardSaveBtn.style.cursor = 'pointer';
      } else {
        wizardSaveBtn.style.background = '#cbd5e1';
        wizardSaveBtn.style.color = '#475569';
        wizardSaveBtn.style.cursor = 'not-allowed';
      }
    };

    async function loadWizardProcedures() {
      if (!wizardProcDropdown) return;
      try {
        const { data: procedures, error } = await supabase.from('procedimientos').select('*').order('nombre');
        if (error) throw error;

        wizardProcDropdown.innerHTML = `
          <div style="max-height: 200px; overflow-y: auto;">
            ${procedures.map(p => `
              <div class="wizard-proc-item" data-id="${p.id}" data-name="${p.nombre}" style="padding: 0.75rem; border-bottom: 1px solid #f1f5f9; cursor: pointer; text-align: left; font-size: 0.9rem; color: #334155;">
                ${p.nombre}
              </div>
            `).join('')}
          </div>
        `;

        wizardProcDropdown.querySelectorAll('.wizard-proc-item').forEach(item => {
          item.addEventListener('click', () => {
            wizardProcSelect.querySelector('span').textContent = item.dataset.name;
            wizardProcSelect.querySelector('span').style.color = '#334155';
            wizardProcSelect.dataset.procId = item.dataset.id;
            wizardProcDropdown.style.display = 'none';
            
            // Reset and enable Appointment select
            wizardAptSelect.querySelector('span').textContent = 'Selecciona una Cita';
            wizardAptSelect.querySelector('span').style.color = '#334155';
            wizardAptSelect.style.background = 'white';
            wizardAptSelect.style.border = '1px solid #cbd5e1';
            wizardAptSelect.style.cursor = 'pointer';
            delete wizardAptSelect.dataset.aptId;
            
            loadWizardAppointments(wizardClientSelect.dataset.clientId, item.dataset.id);
            validateWizard();
          });
        });
      } catch (err) {
        console.error('Error al cargar procedimientos en wizard:', err.message);
      }
    }

    async function loadWizardAppointments(clientId, procId) {
      if (!wizardAptDropdown) return;
      try {
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('client_id', clientId)
          .eq('procedure_id', procId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;

        if (!appointments || appointments.length === 0) {
          wizardAptDropdown.innerHTML = `<p style="color: #64748b; font-size: 0.9rem; padding: 1rem;">No hay citas para este cliente y procedimiento</p>`;
        } else {
          wizardAptDropdown.innerHTML = `
            <div style="max-height: 200px; overflow-y: auto;">
              ${appointments.map(a => {
                const date = new Date(a.created_at).toLocaleString();
                return `
                  <div class="wizard-apt-item" data-id="${a.id}" data-date="${date}" style="padding: 0.75rem; border-bottom: 1px solid #f1f5f9; cursor: pointer; text-align: left; font-size: 0.9rem; color: #334155;">
                    ${date}
                  </div>
                `;
              }).join('')}
            </div>
          `;

          wizardAptDropdown.querySelectorAll('.wizard-apt-item').forEach(item => {
            item.addEventListener('click', () => {
              wizardAptSelect.querySelector('span').textContent = item.dataset.date;
              wizardAptSelect.querySelector('span').style.color = '#334155';
              wizardAptSelect.dataset.aptId = item.dataset.id;
              wizardAptDropdown.style.display = 'none';
              validateWizard();
            });
          });
        }
      } catch (err) {
        console.error('Error al cargar citas en wizard:', err.message);
      }
    }

    async function loadWizardClients() {
      if (!wizardClientDropdown) return;
      try {
        const { data: clients, error } = await supabase.from('clients').select('*').order('nombre_completo');
        if (error) throw error;

        if (!clients || clients.length === 0) {
          wizardClientDropdown.innerHTML = `
            <p style="color: #64748b; font-size: 0.9rem; margin-top: 0; margin-bottom: 1rem;">No se encontraron resultados</p>
            <button id="wizard-create-client" style="background: #06b6d4; color: white; border: none; padding: 0.6rem 1rem; border-radius: 6px; font-weight: 500; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <span style="font-size: 1.2rem;">+</span> Crear nuevo cliente
            </button>
          `;
        } else {
          wizardClientDropdown.innerHTML = `
            <div style="max-height: 200px; overflow-y: auto; margin-bottom: 1rem;">
              ${clients.map(c => `
                <div class="wizard-client-item" data-id="${c.id}" data-name="${c.nombre_completo}" style="padding: 0.75rem; border-bottom: 1px solid #f1f5f9; cursor: pointer; text-align: left; font-size: 0.9rem;">
                  ${c.nombre_completo}
                </div>
              `).join('')}
            </div>
            <button id="wizard-create-client" style="background: #06b6d4; color: white; border: none; padding: 0.6rem 1rem; border-radius: 6px; font-weight: 500; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <span style="font-size: 1.2rem;">+</span> Crear nuevo cliente
            </button>
          `;

          wizardClientDropdown.querySelectorAll('.wizard-client-item').forEach(item => {
            item.addEventListener('click', () => {
              wizardClientSelect.querySelector('span').textContent = item.dataset.name;
              wizardClientSelect.querySelector('span').style.color = '#334155';
              wizardClientSelect.dataset.clientId = item.dataset.id;
              wizardClientDropdown.style.display = 'none';
              
              // Enable Procedure select
              wizardProcSelect.querySelector('span').textContent = 'Selecciona un Procedimiento';
              wizardProcSelect.querySelector('span').style.color = '#334155';
              wizardProcSelect.style.background = 'white';
              wizardProcSelect.style.border = '1px solid #cbd5e1';
              wizardProcSelect.style.cursor = 'pointer';
              
              // Reset Procedure and Appointment
              delete wizardProcSelect.dataset.procId;
              wizardAptSelect.querySelector('span').textContent = 'Selecciona un cliente primero';
              wizardAptSelect.querySelector('span').style.color = '#94a3b8';
              wizardAptSelect.style.background = '#f8fafc';
              wizardAptSelect.style.cursor = 'not-allowed';
              delete wizardAptSelect.dataset.aptId;

              loadWizardProcedures();
              validateWizard();
            });
          });
        }
        
        const createBtn = document.getElementById('wizard-create-client');
        if (createBtn) {
          createBtn.addEventListener('click', () => {
            wizardClientSelect.querySelector('span').textContent = 'Cliente Nuevo';
            wizardClientSelect.dataset.clientId = ''; 
            wizardClientDropdown.style.display = 'none';
            wizardSaveBtn.style.background = '#06b6d4';
            wizardSaveBtn.style.color = 'white';
            wizardSaveBtn.style.cursor = 'pointer';
          });
        }
      } catch (err) {
        console.error('Error al cargar clientes en wizard:', err.message);
      }
    }

    if (closeInternalGalleryBtn) {
      closeInternalGalleryBtn.addEventListener('click', () => {
        internalGalleryModal.style.display = 'none';
        selectedInternalPhotos.clear();
        updateActionBar();
      });
    }

    const addImagesModal = document.getElementById('add-images-modal');
    const wizardImagesContainer = document.getElementById('wizard-images-container');
    const addImagesBackBtn = document.getElementById('add-images-back');
    const wizardClientSelect = document.getElementById('wizard-client-select');
    const wizardClientDropdown = document.getElementById('wizard-client-dropdown');
    const wizardSaveBtn = document.getElementById('wizard-save-btn');

    if (addImagesBackBtn) {
      addImagesBackBtn.addEventListener('click', () => {
        addImagesModal.style.display = 'none';
        internalGalleryModal.style.display = 'flex';
      });
    }

    if (wizardClientSelect) {
      wizardClientSelect.addEventListener('click', () => {
        wizardClientDropdown.style.display = wizardClientDropdown.style.display === 'none' ? 'block' : 'none';
        wizardProcDropdown.style.display = 'none';
        wizardAptDropdown.style.display = 'none';
      });
    }

    if (wizardProcSelect) {
      wizardProcSelect.addEventListener('click', () => {
        if (wizardProcSelect.style.cursor === 'not-allowed') return;
        wizardProcDropdown.style.display = wizardProcDropdown.style.display === 'none' ? 'block' : 'none';
        wizardClientDropdown.style.display = 'none';
        wizardAptDropdown.style.display = 'none';
      });
    }

    if (wizardAptSelect) {
      wizardAptSelect.addEventListener('click', () => {
        if (wizardAptSelect.style.cursor === 'not-allowed') return;
        wizardAptDropdown.style.display = wizardAptDropdown.style.display === 'none' ? 'block' : 'none';
        wizardClientDropdown.style.display = 'none';
        wizardProcDropdown.style.display = 'none';
      });
    }

    if (wizardSaveBtn) {
      wizardSaveBtn.addEventListener('click', () => {
        if (wizardSaveBtn.style.cursor === 'not-allowed') return;

        // Remove empty state if it exists
        if (galeriaContent.classList.contains('empty-state-galeria')) {
          galeriaContent.innerHTML = '';
          galeriaContent.classList.remove('empty-state-galeria');
          galeriaContent.style.display = 'grid';
          galeriaContent.style.gridTemplateColumns = 'repeat(3, 1fr)';
          galeriaContent.style.gap = '0.5rem';
          galeriaContent.style.alignItems = 'start';
          galeriaContent.style.justifyContent = 'start';
          galeriaContent.style.padding = '1rem';
          galeriaContent.style.paddingBottom = '80px';
        }

        // Update or duplicate photos in the main wall
        const wizardItems = wizardImagesContainer.querySelectorAll('div[data-photo-idx]');
        wizardItems.forEach(item => {
          const idx = parseInt(item.dataset.photoIdx);
          const photo = allPhotosData[idx];
          if (!photo) return;
          
          const newTag = item.querySelector('.tag-text').textContent;
          const clientId = wizardClientSelect.dataset.clientId || null;
          const appointmentId = wizardAptSelect.dataset.aptId || null;

          // Si la etiqueta ha cambiado, el usuario quiere un duplicado con la nueva etiqueta
          if (photo.tag !== newTag) {
            dbSavePhoto(photo.data_url, clientId, appointmentId, newTag); // Insertar nueva
          } else {
            // Si la etiqueta es la misma, solo "movemos" la foto (actualizamos IDs)
            dbSavePhoto(photo.data_url, clientId, appointmentId, newTag, photo.id); // Actualizar existente
          }
        });

        console.log('Fotos añadidas desde el asistente:', selectedInternalPhotos.size);

        // Close all
        addImagesModal.style.display = 'none';
        internalGalleryModal.style.display = 'none';
        selectedInternalPhotos.clear();
        updateActionBar();
        
        // Reset wizard state
        wizardClientSelect.querySelector('span').textContent = 'Selecciona un Cliente';
        wizardClientSelect.querySelector('span').style.color = '#64748b';
        delete wizardClientSelect.dataset.clientId;

        wizardProcSelect.querySelector('span').textContent = 'Selecciona un cliente primero';
        wizardProcSelect.querySelector('span').style.color = '#94a3b8';
        wizardProcSelect.style.background = '#f8fafc';
        wizardProcSelect.style.cursor = 'not-allowed';
        delete wizardProcSelect.dataset.procId;

        wizardAptSelect.querySelector('span').textContent = 'Selecciona un procedimiento primero';
        wizardAptSelect.querySelector('span').style.color = '#94a3b8';
        wizardAptSelect.style.background = '#f8fafc';
        wizardAptSelect.style.cursor = 'not-allowed';
        delete wizardAptSelect.dataset.aptId;

        wizardSaveBtn.style.background = '#cbd5e1';
        wizardSaveBtn.style.color = '#475569';
        wizardSaveBtn.style.cursor = 'not-allowed';
      });
    }

    if (addToMainGalleryBtn) {
      addToMainGalleryBtn.addEventListener('click', () => {
        if (currentImageContext === 'appointment') {
          // Skip wizard for appointments, just add them
          selectedInternalPhotos.forEach(idx => {
            const photo = allPhotosData[idx];
            if (photo) addAptPhoto(photo.data_url, photo.id);
          });
          internalGalleryModal.style.display = 'none';
          selectedInternalPhotos.clear();
          updateActionBar();
          return;
        }

        internalGalleryModal.style.display = 'none';
        addImagesModal.style.display = 'flex';
        wizardImagesContainer.innerHTML = '';
        loadWizardClients();

        selectedInternalPhotos.forEach(idx => {
          const dataUrl = allPhotosData[idx] ? allPhotosData[idx].data_url : null;
          if (!dataUrl) return;
          
          const div = document.createElement('div');
          div.dataset.photoIdx = idx; // Guardar el índice para identificarla al guardar
          div.style.minWidth = '160px';
          div.style.width = '160px';
          div.style.height = '160px';
          div.style.position = 'relative';
          div.style.borderRadius = '12px';
          div.style.overflow = 'visible'; // important to let dropdown overhang
      
          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '12px';
      
          // Tag Overlay
          const tagBar = document.createElement('div');
          tagBar.style.position = 'absolute';
          tagBar.style.bottom = '8px';
          tagBar.style.left = '8px';
          tagBar.style.right = '8px';
          tagBar.style.background = 'rgba(100,116,139,0.85)';
          tagBar.style.backdropFilter = 'blur(4px)';
          tagBar.style.color = 'white';
          tagBar.style.fontSize = '0.8rem';
          tagBar.style.padding = '0.5rem';
          tagBar.style.borderRadius = '6px';
          tagBar.style.display = 'flex';
          tagBar.style.justifyContent = 'space-between';
          tagBar.style.cursor = 'pointer';
          tagBar.innerHTML = `<span class="tag-text">Sin Etiqueta</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
      
          const tagMenu = document.createElement('div');
          tagMenu.style.display = 'none';
          tagMenu.style.position = 'absolute';
          tagMenu.style.bottom = '46px';
          tagMenu.style.left = '8px';
          tagMenu.style.background = '#f8fafc';
          tagMenu.style.borderRadius = '8px';
          tagMenu.style.width = '140px';
          tagMenu.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
          tagMenu.style.overflow = 'hidden';
          tagMenu.style.zIndex = '50';
          
          const options = ['Sin etiqueta', 'Antes', 'Después'];
          options.forEach(opt => {
            const item = document.createElement('div');
            item.style.padding = '0.8rem 1rem';
            item.style.fontSize = '0.9rem';
            item.style.color = opt === 'Sin etiqueta' ? '#06b6d4' : '#334155';
            item.style.cursor = 'pointer';
            item.innerText = opt;
            item.style.borderBottom = '1px solid #f1f5f9';
            
            item.addEventListener('click', (e) => {
               e.stopPropagation();
               tagBar.querySelector('.tag-text').innerText = opt;
               tagMenu.style.display = 'none';
               
               Array.from(tagMenu.children).forEach(c => c.style.color = '#334155');
               item.style.color = '#06b6d4';
            });
            tagMenu.appendChild(item);
          });
      
          tagBar.addEventListener('click', () => {
             tagMenu.style.display = tagMenu.style.display === 'none' ? 'block' : 'none';
          });
      
          div.appendChild(img);
          div.appendChild(tagMenu);
          div.appendChild(tagBar);
          wizardImagesContainer.appendChild(div);
        });
      });
    }

    function renderInternalGallery() {
      if (!internalGalleryGrid) return;
      internalGalleryGrid.innerHTML = '';
      
      // If we are in appointment context, we might want to show all photos 
      // but especially those from the same client or generic ones.
      // For now, let's show ALL photos as requested "like the gallery we have".
      
      if (allPhotosData.length === 0) {
        internalGalleryGrid.innerHTML = '<p style="grid-column: span 3; text-align: center; margin-top: 2rem; color: #64748b;">No hay fotos guardadas.</p>';
        return;
      }

      allPhotosData.forEach((photo, idx) => {
        const dataUrl = photo.data_url;
        const renderDiv = document.createElement('div');
        renderDiv.style.width = '100%';
        renderDiv.style.height = '0';
        renderDiv.style.paddingBottom = '100%';
        renderDiv.style.borderRadius = '12px';
        renderDiv.style.overflow = 'hidden';
        renderDiv.style.cursor = 'pointer';
        renderDiv.style.position = 'relative';
        renderDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
        renderDiv.style.backgroundColor = '#f1f5f9';
        
        const renderImg = document.createElement('img');
        renderImg.src = dataUrl;
        renderImg.style.position = 'absolute';
        renderImg.style.top = '0';
        renderImg.style.left = '0';
        renderImg.style.width = '100%';
        renderImg.style.height = '100%';
        renderImg.style.objectFit = 'cover';

        const btnDel = document.createElement('button');
        btnDel.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>';
        btnDel.style.position = 'absolute';
        btnDel.style.top = '8px';
        btnDel.style.right = '8px';
        btnDel.style.background = 'rgba(239, 68, 68, 0.9)';
        btnDel.style.border = 'none';
        btnDel.style.borderRadius = '8px';
        btnDel.style.padding = '6px';
        btnDel.style.cursor = 'pointer';
        btnDel.style.display = 'flex';
        btnDel.style.alignItems = 'center';
        btnDel.style.justifyContent = 'center';
        btnDel.style.zIndex = '10';
        btnDel.onclick = (e) => {
          e.stopPropagation();
          dbDeletePhoto(photo.id);
        };

        const circle = document.createElement('div');
        circle.style.position = 'absolute';
        circle.style.top = '8px';
        circle.style.left = '8px';
        circle.style.width = '24px';
        circle.style.height = '24px';
        circle.style.borderRadius = '50%';
        circle.style.border = '2px solid white';
        circle.style.display = 'flex';
        circle.style.alignItems = 'center';
        circle.style.justifyContent = 'center';
        circle.style.zIndex = '5';
        
        // Update selection UI based on current state
        const updateSelectionUI = () => {
          if (selectedInternalPhotos.has(idx)) {
            circle.style.background = '#00897b'; 
            circle.style.borderColor = '#00897b';
            circle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            renderDiv.style.transform = 'scale(0.96)';
            renderDiv.style.transition = 'transform 0.15s ease';
          } else {
            circle.style.background = 'rgba(0,0,0,0.3)';
            circle.style.borderColor = 'white';
            circle.innerHTML = '';
            renderDiv.style.transform = 'scale(1)';
            renderDiv.style.transition = 'transform 0.15s ease';
          }
        };

        updateSelectionUI();

        renderDiv.addEventListener('click', () => {
          if (selectedInternalPhotos.has(idx)) {
            selectedInternalPhotos.delete(idx);
          } else {
            selectedInternalPhotos.add(idx);
          }
          updateSelectionUI();
          updateActionBar();
        });

        renderDiv.appendChild(renderImg);
        renderDiv.appendChild(circle);
        renderDiv.appendChild(btnDel);
        internalGalleryGrid.appendChild(renderDiv);
      });
    };

    if (webcamCaptureBtn) {
      webcamCaptureBtn.addEventListener('click', () => {
        if (!webcamVideo.videoWidth) return;
        webcamCanvas.width = webcamVideo.videoWidth;
        webcamCanvas.height = webcamVideo.videoHeight;
        const ctx = webcamCanvas.getContext('2d');
        ctx.drawImage(webcamVideo, 0, 0, webcamCanvas.width, webcamCanvas.height);
        
        const dataUrl = webcamCanvas.toDataURL('image/jpeg', 0.9);
        
        if (currentImageContext === 'product') {
          updateProductImagePreview(dataUrl);
        } else if (currentImageContext === 'edit-product') {
          updateEditProductImagePreview(dataUrl);
        } else if (currentImageContext === 'appointment') {
          addAptPhoto(dataUrl);
        } else {
          // Save to internal gallery explicitly (don't download)
          internalSessionPhotos.unshift(dataUrl);
          dbSavePhoto(dataUrl); // Save to DB for persistence
          alert('Foto guardada en Galería.');
        }
        stopWebcam();
      });
    }

    const processImageFile = (file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        if (currentImageContext === 'product') {
          updateProductImagePreview(dataUrl);
        } else if (currentImageContext === 'edit-product') {
          updateEditProductImagePreview(dataUrl);
        } else if (currentImageContext === 'appointment') {
          addAptPhoto(dataUrl);
        } else {
          internalSessionPhotos.unshift(dataUrl);
          dbSavePhoto(dataUrl); // Save to DB for persistence
          alert('Foto guardada en Galería.');
        }
      };
      reader.readAsDataURL(file);
    };

    // Capture mobile photo and save inside internal gallery
    cameraInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        processImageFile(e.target.files[0]);
      }
    });

    // File selection from PC explorer
    if (galleryInput) {
      galleryInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          processImageFile(e.target.files[0]);
        }
      });
    }

    btnCameraAction.addEventListener('click', () => {
      imageSourceModal.style.display = 'none';
      
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // En móviles, usamos la app de cámara nativa del sistema
        cameraInput.click();
      } else {
        // En PC, no hay app nativa de cámara, abrimos el visor integrado
        startWebcam();
      }
    });

    btnGalleryAction.addEventListener('click', () => {
      imageSourceModal.style.display = 'none';
      
      if (currentImageContext === 'product' || currentImageContext === 'edit-product') {
        // En productos, "GALERÍA" abre el explorador de archivos del PC/Móvil
        if (galleryInput) galleryInput.click();
      } else {
        // En la Galería general o citas, abre la UI custom con las fotos ya capturadas
        if (internalGalleryModal) {
          internalGalleryModal.style.display = 'flex';
          renderInternalGallery();
        }
      }
    });
  }

  const fabAddCliente = document.querySelector('.fab-add-cliente');
  const addClienteModal = document.getElementById('add-cliente-modal');
  const addClienteBackBtn = document.getElementById('add-cliente-back');

  if (fabAddCliente && addClienteModal) {
    fabAddCliente.addEventListener('click', () => {
      addClienteModal.style.display = 'block';
    });
  }

  if (addClienteBackBtn && addClienteModal) {
    addClienteBackBtn.addEventListener('click', () => {
      addClienteModal.style.display = 'none';
    });
  }

  const addClienteSaveBtn = document.getElementById('add-cliente-save');
  if (addClienteSaveBtn && addClienteModal) {
    addClienteSaveBtn.addEventListener('click', async () => {
      const name = document.getElementById('client-name').value;
      const nif = document.getElementById('client-nif').value;
      const bday = document.getElementById('client-birthday').value;
      const email = document.getElementById('client-email').value;
      const phone = document.getElementById('client-phone').value;
      const gender = document.getElementById('client-gender').value;
      const centroId = document.getElementById('client-centro-id').value;

      if (!name) {
        alert('El nombre es obligatorio');
        return;
      }

      addClienteSaveBtn.disabled = true;
      addClienteSaveBtn.textContent = 'Guardando...';

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No hay sesión activa');

        const { error } = await supabase.from('clients').insert([
          {
            professional_id: user.id,
            nombre_completo: name,
            nif: nif,
            fecha_nacimiento: bday || null,
            email: email,
            telefono: phone,
            genero: gender,
            centro_id: centroId || null
          }
        ]);

        if (error) throw error;

        // Reset and close
        document.getElementById('client-name').value = '';
        document.getElementById('client-nif').value = '';
        document.getElementById('client-birthday').value = '';
        document.getElementById('client-email').value = '';
        document.getElementById('client-phone').value = '';
        document.getElementById('client-centro-id').value = '';
        
        addClienteModal.style.display = 'none';
        loadClientes(); // Reload list
      } catch (err) {
        console.error('Error saving client:', err.message);
        alert('Error al guardar: ' + err.message);
      } finally {
        addClienteSaveBtn.disabled = false;
        addClienteSaveBtn.textContent = 'Guardar';
      }
    });
  }

  async function loadClientes() {
    const clientesContent = document.querySelector('.clientes-content');
    if (!clientesContent) return;

    await populateCentrosDropdowns();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('clients')
        .select('*');

      if (globalCentroFilterId) {
        query = query.eq('centro_id', globalCentroFilterId);
      }

      const { data: clients, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (!clients || clients.length === 0) {
        allClientsData = [];
        clientesContent.innerHTML = `
          <div class="img-placeholder" style="width: 90px; height: 90px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <h3 style="color: #1e293b; font-size: 1.1rem; font-weight: 600; margin: 0 0 0.5rem 0;">No hay clientes aún</h3>
          <p style="color: #94a3b8; font-size: 0.95rem; margin: 0;">Agrega tu primer cliente</p>
        `;
        clientesContent.classList.add('empty-state-clientes');
        clientesContent.style.justifyContent = 'center';
        clientesContent.style.height = 'calc(100vh - 250px)';
      } else {
        allClientsData = clients;
        renderClientesList(clients);
      }
    } catch (err) {
        console.error('Error loading clients:', err.message);
    }
  }

  // Handle Client Search
  const clientSearchInput = document.getElementById('client-search-input');
  if (clientSearchInput) {
    clientSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        renderClientesList(allClientsData);
        return;
      }

      const filtered = allClientsData.filter(client => {
        const nameMatch = client.nombre_completo.toLowerCase().includes(query);
        const emailMatch = (client.email || '').toLowerCase().includes(query);
        const nifMatch = (client.nif || '').toLowerCase().includes(query);
        return nameMatch || emailMatch || nifMatch;
      });

      renderClientesList(filtered);
    });
  }

  let currentEditingClient = null;

  function renderClientesList(clients) {
    const clientesContent = document.querySelector('.clientes-content');
    clientesContent.innerHTML = '';
    clientesContent.classList.remove('empty-state-clientes');
    clientesContent.style.justifyContent = 'flex-start';
    clientesContent.style.height = 'auto';
    clientesContent.style.display = 'block';

    clients.forEach(client => {
      const initials = client.nombre_completo.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      const card = document.createElement('div');
      card.style.background = 'white';
      card.style.width = '100%';
      card.style.borderRadius = '12px';
      card.style.padding = '1rem';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.gap = '1rem';
      card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
      card.style.marginBottom = '0.75rem';
      card.style.boxSizing = 'border-box';

      card.innerHTML = `
        <div style="width: 48px; height: 48px; border-radius: 50%; background: #06b6d4; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1rem; flex-shrink: 0;">
          ${initials}
        </div>
        <div style="text-align: left; overflow: hidden;">
          <h3 style="margin: 0; font-size: 1rem; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${client.nombre_completo}</h3>
          <p style="margin: 2px 0 0 0; font-size: 0.85rem; color: #94a3b8;">${client.email || 'Sin email'} • ${client.nif || 'No NIF'}</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: auto; flex-shrink: 0;"><path d="m9 18 6-6-6-6"/></svg>
      `;

      card.addEventListener('click', () => {
        openClientProfile(client);
      });

      clientesContent.appendChild(card);
    });
  }

  async function openClientProfile(client) {
    const profileView = document.getElementById('client-profile-view');
    if (!profileView) return;

    document.getElementById('profile-name').textContent = client.nombre_completo;
    document.getElementById('profile-bday').textContent = client.fecha_nacimiento ? formatDate(client.fecha_nacimiento) : 'Sin fecha';
    document.getElementById('profile-gender').textContent = client.genero || 'No especificado';
    
    // Set center name
    const profileCentro = document.getElementById('profile-centro');
    if (profileCentro) {
      if (client.centro_id) {
        const centro = allCentrosData.find(c => c.id === client.centro_id);
        if (centro) {
          profileCentro.textContent = centro.nombre;
        } else {
          const { data } = await supabase.from('centros').select('nombre').eq('id', client.centro_id).single();
          profileCentro.textContent = data ? data.nombre : 'Desconocido';
        }
      } else {
        profileCentro.textContent = 'Sin asignar';
      }
    }

    // Update initials in avatar
    const initials = client.nombre_completo.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const avatar = document.getElementById('profile-avatar');
    avatar.innerHTML = initials;

    currentEditingClient = client;
    profileView.style.display = 'block';
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }

  const profileBackBtn = document.getElementById('client-profile-back');
  if (profileBackBtn) {
    profileBackBtn.addEventListener('click', () => {
      document.getElementById('client-profile-view').style.display = 'none';
      currentEditingClient = null;
    });
  }

  const editProfileBtn = document.getElementById('edit-profile-btn');
  const editClienteModal = document.getElementById('edit-cliente-modal');
  const editClienteBackBtn = document.getElementById('edit-cliente-back');
  const editClientSaveBtn = document.getElementById('edit-client-save');

  if (editProfileBtn && editClienteModal) {
    editProfileBtn.addEventListener('click', () => {
      if (!currentEditingClient) return;
      
      document.getElementById('edit-client-name').value = currentEditingClient.nombre_completo;
      document.getElementById('edit-client-nif').value = currentEditingClient.nif || '';
      document.getElementById('edit-client-birthday').value = currentEditingClient.fecha_nacimiento || '';
      document.getElementById('edit-client-email').value = currentEditingClient.email || '';
      document.getElementById('edit-client-phone').value = currentEditingClient.telefono || '';
      document.getElementById('edit-client-gender').value = currentEditingClient.genero || 'Hombre';
      document.getElementById('edit-client-centro-id').value = currentEditingClient.centro_id || '';
      
      editClienteModal.style.display = 'block';
    });
  }

  if (editClienteBackBtn) {
    editClienteBackBtn.addEventListener('click', () => {
      editClienteModal.style.display = 'none';
    });
  }

  if (editClientSaveBtn) {
    editClientSaveBtn.addEventListener('click', async () => {
      if (!currentEditingClient) return;

      const name = document.getElementById('edit-client-name').value;
      const nif = document.getElementById('edit-client-nif').value;
      const bday = document.getElementById('edit-client-birthday').value;
      const email = document.getElementById('edit-client-email').value;
      const phone = document.getElementById('edit-client-phone').value;
      const gender = document.getElementById('edit-client-gender').value;
      const centroId = document.getElementById('edit-client-centro-id').value;

      if (!name) {
        alert('El nombre es obligatorio');
        return;
      }

      editClientSaveBtn.disabled = true;
      editClientSaveBtn.textContent = 'Guardando...';

      try {
        const { error } = await supabase
          .from('clients')
          .update({
            nombre_completo: name,
            nif: nif,
            fecha_nacimiento: bday || null,
            email: email,
            telefono: phone,
            genero: gender,
            centro_id: centroId || null
          })
          .eq('id', currentEditingClient.id);

        if (error) throw error;

        // Update current local object
        currentEditingClient.nombre_completo = name;
        currentEditingClient.nif = nif;
        currentEditingClient.fecha_nacimiento = bday;
        currentEditingClient.email = email;
        currentEditingClient.telefono = phone;
        currentEditingClient.genero = gender;
        currentEditingClient.centro_id = centroId;

        // Refresh profile view
        openClientProfile(currentEditingClient);
        
        editClienteModal.style.display = 'none';
        loadClientes(); // Refresh list in background
      } catch (err) {
        alert('Error al actualizar: ' + err.message);
      } finally {
        editClientSaveBtn.disabled = false;
        editClientSaveBtn.textContent = 'Guardar Cambios';
      }
    });
  }

  const deleteProfileBtn = document.getElementById('delete-profile-btn');
  const deleteConfirmModal = document.getElementById('delete-confirm-modal');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');

  if (deleteProfileBtn && deleteConfirmModal) {
    deleteProfileBtn.addEventListener('click', () => {
      deleteConfirmModal.style.display = 'flex';
    });
  }

  if (btnCancelDelete) {
    btnCancelDelete.addEventListener('click', () => {
      deleteConfirmModal.style.display = 'none';
    });
  }

  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', async () => {
      if (!currentEditingClient) return;

      btnConfirmDelete.disabled = true;
      btnConfirmDelete.textContent = 'BORRANDO...';

      try {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', currentEditingClient.id);

        if (error) throw error;

        // Success
        deleteConfirmModal.style.display = 'none';
        document.getElementById('client-profile-view').style.display = 'none';
        currentEditingClient = null;
        loadClientes(); // Reload list
      } catch (err) {
        alert('Error al eliminar: ' + err.message);
      } finally {
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.textContent = 'ELIMINAR';
      }
    });
  }

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        dashboardView.style.display = 'none';
        loginView.style.display = 'flex';
        // reset tabs
        navItems.forEach(ni => ni.classList.remove('active'));
        navItems[0].classList.add('active');
      }
    });
  }

  // --- PRODUCTOS LOGIC ---
  const btnSaveProduct = document.getElementById('btn-save-product');
  if (btnSaveProduct) {
    btnSaveProduct.addEventListener('click', async () => {
      const nombreInput = document.getElementById('product-name');
      const descripcionInput = document.getElementById('product-description');
      
      const nombre = nombreInput.value.trim();
      const descripcion = descripcionInput.value.trim();
      
      if (!nombre) {
        alert('El nombre del producto es obligatorio');
        return;
      }

      btnSaveProduct.disabled = true;
      btnSaveProduct.innerHTML = 'Guardando...';

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No hay sesión activa');

        const { error } = await supabase
          .from('productos')
          .insert({
            nombre,
            descripcion,
            imagen_url: currentProductImageData,
            user_id: user.id
          });

        if (error) throw error;

        // Reset fields
        nombreInput.value = '';
        descripcionInput.value = '';
        currentProductImageData = null;
        if (productPreviewArea) {
          productPreviewArea.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/></svg>`;
        }

        // Navigate back
        switchToView('Productos');
      } catch (err) {
        alert('Error al guardar producto: ' + err.message);
      } finally {
        btnSaveProduct.disabled = false;
        btnSaveProduct.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" x2="12" x2="16" y2="12"/></svg>
          Agregar al inventario
        `;
      }
    });
  }

  async function loadProductos() {
    const productosList = document.getElementById('productos-list');
    if (!productosList) return;

    try {
      const { data: productos, error } = await supabase
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      allProductData = productos || [];
      renderProductosList(allProductData);
    } catch (err) {
      console.error('Error loading productos:', err.message);
    }
  }

  const productSearchInput = document.getElementById('product-search-input');
  if (productSearchInput) {
    productSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        renderProductosList(allProductData);
        return;
      }

      const filtered = allProductData.filter(p => 
        p.nombre.toLowerCase().includes(query) || 
        (p.descripcion && p.descripcion.toLowerCase().includes(query))
      );
      renderProductosList(filtered);
    });
  }

  function renderProductosList(productos) {
    const productosList = document.getElementById('productos-list');
    if (!productosList) return;

    if (!productos || productos.length === 0) {
      productosList.innerHTML = '<p style="color: #94a3b8; font-size: 1.1rem; line-height: 1.5;">No hay productos, agrega uno nuevo!</p>';
      productosList.style.justifyContent = 'center';
      return;
    }

    productosList.innerHTML = '';
    productosList.style.justifyContent = 'flex-start';
    productosList.style.gap = '1rem';

    productos.forEach(prod => {
      const card = document.createElement('div');
      card.style.width = '100%';
      card.style.background = 'white';
      card.style.borderRadius = '16px';
      card.style.padding = '1rem';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.gap = '1rem';
      card.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
      card.style.boxSizing = 'border-box';
      card.style.marginBottom = '0.75rem';
      card.style.cursor = 'pointer'; // Make it look clickable
      card.onclick = () => openEditProduct(prod.id); // Add click listener

      let imgHtml = '';
      if (prod.imagen_url && prod.imagen_url.startsWith('<svg')) {
        // Icon circular cyan background as in user image
        imgHtml = `
          <div style="width: 50px; height: 50px; border-radius: 50%; background: #00bcd4; display: flex; align-items: center; justify-content: center; color: white; overflow: hidden; flex-shrink: 0;">
            ${prod.imagen_url.replace(/width="[^"]*"/, 'width="26"').replace(/height="[^"]*"/, 'height="26"').replace(/stroke="[^"]*"/, 'stroke="white"')}
          </div>
        `;
      } else if (prod.imagen_url) {
        imgHtml = `<img src="${prod.imagen_url}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />`;
      } else {
        imgHtml = `
          <div style="width: 50px; height: 50px; border-radius: 50%; background: #00bcd4; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-3-3"/><path d="m21 16-3 3"/><path d="m3 16 3 3"/><path d="m3 8 3-3"/><circle cx="12" cy="12" r="3"/><path d="M12 7v5l3 3"/></svg>
          </div>
        `;
      }

      card.innerHTML = `
        ${imgHtml}
        <div style="flex: 1; text-align: left; overflow: hidden;">
          <h4 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${prod.nombre}</h4>
          <p style="margin: 2px 0 0 0; font-size: 0.85rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${prod.descripcion || 'Sin descripción'}</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      `;

      productosList.appendChild(card);
    });
  }

  const backFromEditarProducto = document.getElementById('back-from-editar-producto');
  if (backFromEditarProducto) {
    backFromEditarProducto.addEventListener('click', () => {
      switchToView('Productos');
    });
  }

  window.openEditProduct = (productId) => {
    const product = allProductData.find(p => p.id === productId);
    if (!product) return;

    editingProductId = product.id;
    
    document.getElementById('edit-product-name').value = product.nombre || '';
    document.getElementById('edit-product-description').value = product.descripcion || '';
    
    if (product.imagen_url) {
      if (product.imagen_url.startsWith('<svg')) {
        updateEditProductImagePreview(product.imagen_url, true);
      } else {
        updateEditProductImagePreview(product.imagen_url, false);
      }
    } else {
      updateEditProductImagePreview(`<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/></svg>`, true);
    }
    
    switchToView('Editar Producto');
  };

  const btnUpdateProduct = document.getElementById('btn-update-product');
  if (btnUpdateProduct) {
    btnUpdateProduct.addEventListener('click', async () => {
      const nombre = document.getElementById('edit-product-name').value.trim();
      const descripcion = document.getElementById('edit-product-description').value.trim();
      
      if (!nombre) {
        alert('El nombre del producto es obligatorio');
        return;
      }

      btnUpdateProduct.disabled = true;
      btnUpdateProduct.innerHTML = 'Actualizando...';

      try {
        const { error } = await supabase
          .from('productos')
          .update({
            nombre,
            descripcion,
            imagen_url: currentEditProductImageData
          })
          .eq('id', editingProductId);

        if (error) throw error;

        switchToView('Productos');
        await loadProductos();
      } catch (err) {
        alert('Error al actualizar producto: ' + err.message);
      } finally {
        btnUpdateProduct.disabled = false;
        btnUpdateProduct.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
          Actualizar producto
        `;
      }
    });
  }

  const btnDeleteProduct = document.getElementById('btn-delete-product');
  if (btnDeleteProduct) {
    btnDeleteProduct.addEventListener('click', async () => {
      if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
      
      try {
        const { error } = await supabase
          .from('productos')
          .delete()
          .eq('id', editingProductId);

        if (error) throw error;

        switchToView('Productos');
        await loadProductos();
      } catch (err) {
        alert('Error al eliminar producto: ' + err.message);
      }
    });
  }

  let currentProcIconData = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m4.93 4.93 14.14 14.14"/><path d="M2 12h20"/><path d="m19.07 4.93-14.14 14.14"/></svg>`;
  let editingProcId = null;

  const backFromProcedimientos = document.getElementById('back-from-procedimientos');
  if (backFromProcedimientos) {
    backFromProcedimientos.addEventListener('click', () => switchToView('Menú'));
  }

  const backFromCrearProc = document.getElementById('back-from-crear-proc');
  if (backFromCrearProc) {
    backFromCrearProc.addEventListener('click', () => switchToView('Procedimientos'));
  }

  const btnOpenAddProc = document.getElementById('btn-open-add-proc');
  if (btnOpenAddProc) {
    btnOpenAddProc.addEventListener('click', () => {
      editingProcId = null;
      document.querySelector('#view-crear-procedimiento h2').textContent = 'Crear Procedimiento';
      document.getElementById('btn-save-proc').textContent = 'Crear Procedimiento';
      const nameInput = document.getElementById('proc-name');
      if (nameInput) nameInput.value = '';
      switchToView('Crear Procedimiento');
    });
  }

  const btnSaveProc = document.getElementById('btn-save-proc');
  const modalSuccess = document.getElementById('modal-success');
  const btnSuccessOk = document.getElementById('btn-success-ok');

  let successModalDestination = 'Procedimientos';

  if (btnSuccessOk && modalSuccess) {
    btnSuccessOk.addEventListener('click', () => {
      modalSuccess.style.display = 'none';
      switchToView(successModalDestination);
    });
  }

  if (btnSaveProc) {
    btnSaveProc.addEventListener('click', async () => {
      const nameInput = document.getElementById('proc-name');
      const name = nameInput ? nameInput.value.trim() : '';

      if (!name) {
        alert('Introduce el nombre del procedimiento');
        return;
      }

      btnSaveProc.disabled = true;
      btnSaveProc.textContent = 'Guardando...';

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        let error;
        if (editingProcId) {
          // Update
          const { error: err } = await supabase
            .from('procedimientos')
            .update({ nombre: name })
            .eq('id', editingProcId);
          error = err;
        } else {
          // Insert
          const { error: err } = await supabase
            .from('procedimientos')
            .insert({
              nombre: name,
              precio: 0,
              duracion_minutos: 30,
              icon_svg: currentProcIconData,
              user_id: user.id
            });
          error = err;
        }

        if (error) throw error;

        // Show Success Modal
        if (modalSuccess) {
          successModalDestination = 'Procedimientos';
          modalSuccess.querySelector('p').textContent = editingProcId ? 'Procedimiento actualizado con éxito' : 'Procedimiento creado con éxito';
          modalSuccess.style.display = 'flex';
        } else {
          switchToView('Procedimientos');
        }

        // Reset
        if (nameInput) nameInput.value = '';
        editingProcId = null;
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        btnSaveProc.disabled = false;
        btnSaveProc.textContent = 'Crear Procedimiento';
      }
    });
  }

  async function loadProcedimientos() {
    const list = document.getElementById('proc-list');
    if (!list) return;

    try {
      const { data, error } = await supabase
        .from('procedimientos')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      allProcData = data || [];
      renderProcedimientosList(allProcData);
    } catch (err) {
      console.error(err);
    }
  }

  function renderProcedimientosList(procs) {
    const list = document.getElementById('proc-list');
    if (!list) return;

    if (!procs || procs.length === 0) {
      list.innerHTML = `
        <p style="color: #94a3b8; font-size: 1.1rem; margin-bottom: 1.5rem;">No hay procedimientos</p>
        <button id="btn-empty-create-proc" style="padding: 0.75rem 1.5rem; border-radius: 8px; background: #00bcd4; border: none; color: white; font-weight: 700; cursor: pointer; box-shadow: 0 4px 10px rgba(0, 188, 212, 0.3);">Crear Procedimiento</button>
      `;
      list.style.justifyContent = 'center';
      
      const btnEmpty = document.getElementById('btn-empty-create-proc');
      if (btnEmpty) {
        btnEmpty.addEventListener('click', () => {
          editingProcId = null;
          document.querySelector('#view-crear-procedimiento h2').textContent = 'Crear Procedimiento';
          document.getElementById('btn-save-proc').textContent = 'Crear Procedimiento';
          switchToView('Crear Procedimiento');
        });
      }
      return;
    }

    list.innerHTML = '';
    list.style.justifyContent = 'flex-start';
    list.style.gap = '1rem';

    procs.forEach(proc => {
      const card = document.createElement('div');
      card.style.width = '100%';
      card.style.background = 'white';
      card.style.borderRadius = '12px';
      card.style.padding = '0.85rem 1rem';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.justifyContent = 'space-between';
      card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
      card.style.boxSizing = 'border-box';
      card.style.marginBottom = '0.5rem';
      card.style.border = '1px solid #f1f5f9';

      card.innerHTML = `
        <div style="font-weight: 700; font-size: 1rem; color: #1e293b;">${proc.nombre}</div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <button class="btn-edit-proc" style="background: none; border: none; padding: 4px; cursor: pointer; color: #00bcd4; display: flex;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-delete-proc" style="background: none; border: none; padding: 4px; cursor: pointer; color: #ef4444; display: flex;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      `;

      // Event listeners for actions
      const btnEdit = card.querySelector('.btn-edit-proc');
      if (btnEdit) {
        btnEdit.addEventListener('click', () => {
          editingProcId = proc.id;
          document.querySelector('#view-crear-procedimiento h2').textContent = 'Editar Procedimiento';
          document.getElementById('btn-save-proc').textContent = 'Guardar Cambios';
          const nameInput = document.getElementById('proc-name');
          if (nameInput) nameInput.value = proc.nombre;
          switchToView('Crear Procedimiento');
        });
      }

      const btnDel = card.querySelector('.btn-delete-proc');
      if (btnDel) {
        btnDel.addEventListener('click', async () => {
          if (confirm(`¿Estás seguro de que quieres eliminar "${proc.nombre}"?`)) {
            try {
              const { error } = await supabase.from('procedimientos').delete().eq('id', proc.id);
              if (error) throw error;
              loadProcedimientos();
            } catch (err) {
              alert('Error al eliminar: ' + err.message);
            }
          }
        });
      }

      list.appendChild(card);
    });
  }

  // --- CENTROS LOGIC ---
  let allCentrosData = [];
  let editingCentroId = null;

  const btnOpenAddCentro = document.getElementById('btn-open-add-centro');
  if (btnOpenAddCentro) {
    btnOpenAddCentro.addEventListener('click', () => {
      editingCentroId = null;
      document.querySelector('#view-crear-centro h2').textContent = 'Crear un Centro';
      document.getElementById('btn-save-centro').textContent = 'Crear Centro';
      const nameInput = document.getElementById('centro-name');
      if (nameInput) nameInput.value = '';
      switchToView('Crear Centro');
    });
  }

  const backFromCentros = document.getElementById('back-from-centros');
  if (backFromCentros) {
    backFromCentros.addEventListener('click', () => switchToView('Menú'));
  }

  const backFromCrearCentro = document.getElementById('back-from-crear-centro');
  if (backFromCrearCentro) {
    backFromCrearCentro.addEventListener('click', () => switchToView('Centros'));
  }

  const btnSaveCentro = document.getElementById('btn-save-centro');
  if (btnSaveCentro) {
    btnSaveCentro.addEventListener('click', async () => {
      const nameInput = document.getElementById('centro-name');
      const name = nameInput ? nameInput.value.trim() : '';

      if (!name) {
        alert('Introduce el nombre del centro');
        return;
      }

      btnSaveCentro.disabled = true;
      btnSaveCentro.textContent = 'Guardando...';

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        let error;
        if (editingCentroId) {
          const { error: err } = await supabase
            .from('centros')
            .update({ nombre: name })
            .eq('id', editingCentroId);
          error = err;
        } else {
          const { error: err } = await supabase
            .from('centros')
            .insert({
              nombre: name,
              user_id: user.id
            });
          error = err;
        }

        if (error) throw error;

        if (nameInput) nameInput.value = '';

        if (modalSuccess) {
          successModalDestination = 'Centros';
          modalSuccess.querySelector('p').textContent = editingCentroId ? 'El Centro ha sido actualizado exitosamente.' : 'El Centro ha sido creado exitosamente.';
          btnSuccessOk.onclick = null;
          modalSuccess.style.display = 'flex';
        } else {
          switchToView('Centros');
        }
        editingCentroId = null;
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        btnSaveCentro.disabled = false;
        btnSaveCentro.textContent = editingCentroId ? 'Guardar Cambios' : 'Crear Centro';
      }
    });
  }

  async function loadCentros() {
    const list = document.getElementById('centros-list');
    if (!list) return;

    try {
      const { data, error } = await supabase
        .from('centros')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      allCentrosData = data || [];
      renderCentrosList(allCentrosData);
    } catch (err) {
      console.error(err);
    }
  }

  function renderCentrosList(centros) {
    const list = document.getElementById('centros-list');
    if (!list) return;

    if (!centros || centros.length === 0) {
      list.innerHTML = `
        <p style="color: #94a3b8; font-size: 1.1rem; margin-bottom: 2rem;">No hay centros registrados. Crea uno nuevo.</p>
        <button id="btn-empty-create-centro" style="padding: 0.85rem 1.75rem; border-radius: 10px; background: #00bcd4; border: none; color: white; font-size: 1rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);">Crear Centro</button>
      `;
      list.style.justifyContent = 'center';
      
      const btnEmpty = document.getElementById('btn-empty-create-centro');
      if (btnEmpty) {
        btnEmpty.addEventListener('click', () => {
          editingCentroId = null;
          document.querySelector('#view-crear-centro h2').textContent = 'Crear un Centro';
          document.getElementById('btn-save-centro').textContent = 'Crear Centro';
          switchToView('Crear Centro');
        });
      }
      return;
    }

    list.innerHTML = '';
    list.style.justifyContent = 'flex-start';
    list.style.gap = '0.5rem';

    centros.forEach(centro => {
      const card = document.createElement('div');
      card.style.width = '100%';
      card.style.background = 'white';
      card.style.borderRadius = '12px';
      card.style.padding = '0.85rem 1rem';
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.justifyContent = 'space-between';
      card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
      card.style.boxSizing = 'border-box';
      card.style.marginBottom = '0.25rem';
      card.style.border = '1px solid #f1f5f9';

      card.innerHTML = `
        <div style="font-weight: 700; font-size: 1rem; color: #1e293b;">${centro.nombre}</div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <button class="btn-edit-centro" style="background: none; border: none; padding: 4px; cursor: pointer; color: #00bcd4; display: flex;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-delete-centro" style="background: none; border: none; padding: 4px; cursor: pointer; color: #ef4444; display: flex;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      `;

      const btnEdit = card.querySelector('.btn-edit-centro');
      if (btnEdit) {
        btnEdit.addEventListener('click', () => {
          editingCentroId = centro.id;
          document.querySelector('#view-crear-centro h2').textContent = 'Editar Centro';
          document.getElementById('btn-save-centro').textContent = 'Guardar Cambios';
          const nameInput = document.getElementById('centro-name');
          if (nameInput) nameInput.value = centro.nombre;
          switchToView('Crear Centro');
        });
      }

      const btnDel = card.querySelector('.btn-delete-centro');
      if (btnDel) {
        btnDel.addEventListener('click', async () => {
          if (confirm(`¿Estás seguro de que quieres eliminar este centro?`)) {
            try {
              const { error } = await supabase.from('centros').delete().eq('id', centro.id);
              if (error) throw error;
              loadCentros();
            } catch (err) {
              alert('Error al eliminar: ' + err.message);
            }
          }
        });
      }

      list.appendChild(card);
    });
  }

  async function populateCentrosDropdowns() {
    const clientCentroSelect = document.getElementById('client-centro-id');
    const editClientCentroSelect = document.getElementById('edit-client-centro-id');
    if (!clientCentroSelect && !editClientCentroSelect) return;

    try {
      const { data: centros, error } = await supabase
        .from('centros')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) throw error;

      const optionsHtml = `
        <option value="">Seleccionar Centro...</option>
        ${centros.map(c => {
          const isSelected = globalCentroFilterId === c.id ? 'selected' : '';
          return `<option value="${c.id}" ${isSelected}>${c.nombre}</option>`;
        }).join('')}
      `;

      if (clientCentroSelect) clientCentroSelect.innerHTML = optionsHtml;
      if (editClientCentroSelect) editClientCentroSelect.innerHTML = optionsHtml;
    } catch (err) {
      console.error('Error populating centros dropdowns:', err.message);
    }
  }

  const procSearchInput = document.getElementById('proc-search-input');
  if (procSearchInput) {
    procSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const filtered = allProcData.filter(p => p.nombre.toLowerCase().includes(query));
      renderProcedimientosList(filtered);
    });
  }

  // --- REPORTES LOGIC ---
  let allReportesData = [];
  let editingReporteId = null;

  const backFromReportes = document.getElementById('back-from-reportes');
  if (backFromReportes) {
    backFromReportes.addEventListener('click', () => switchToView('Menú'));
  }

  const backFromCrearReporte = document.getElementById('back-from-crear-reporte');
  if (backFromCrearReporte) {
    backFromCrearReporte.addEventListener('click', () => switchToView('Reportes'));
  }

  const btnNuevoReporte = document.getElementById('btn-nuevo-reporte');
  if (btnNuevoReporte) {
    btnNuevoReporte.addEventListener('click', () => {
      editingReporteId = null;
      const titleEl = document.getElementById('crear-reporte-title');
      if (titleEl) titleEl.textContent = 'Generar Reporte';
      
      // Reset view to Step 1
      const stepParametros = document.getElementById('step-parametros-content');
      const stepColumnas = document.getElementById('step-columnas-content');
      const footParametros = document.getElementById('footer-parametros');
      const footColumnas = document.getElementById('footer-columnas');
      const step2Circle = document.getElementById('stepper-2-circle');
      const step2Text = document.getElementById('stepper-2-text');

      if (stepParametros) stepParametros.style.display = 'block';
      if (stepColumnas) stepColumnas.style.display = 'none';
      if (footParametros) footParametros.style.display = 'block';
      if (footColumnas) footColumnas.style.display = 'none';
      
      if (step2Circle) {
        step2Circle.style.background = '#f1f5f9';
        step2Circle.style.color = '#94a3b8';
      }
      if (step2Text) {
        step2Text.style.color = '#94a3b8';
      }

      switchToView('Crear Reporte');
    });
  }

  // --- GENERAR REPORTE CENTRO DROP DOWN LOGIC ---
  const btnGenerarReporteCentro = document.getElementById('btn-generar-reporte-centro');
  const generarReporteCentrosList = document.getElementById('generar-reporte-centros-list');
  const generarReporteCentroChevron = document.getElementById('generar-reporte-centro-chevron');
  const generarReporteCentroText = document.getElementById('generar-reporte-centro-text');
  let selectedGenerarReporteCentroId = null;
  let selectedExportFormat = 'csv'; // 'csv' or 'pdf'

  // --- FORMAT TOGGLE ---
  const btnExportCsvTab = document.getElementById('btn-export-csv');
  const btnExportPdfTab = document.getElementById('btn-export-pdf');

  function updateFormatToggle() {
    if (!btnExportCsvTab || !btnExportPdfTab) return;
    if (selectedExportFormat === 'csv') {
      btnExportCsvTab.style.background = 'white';
      btnExportCsvTab.style.color = '#00bcd4';
      btnExportCsvTab.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      btnExportPdfTab.style.background = 'transparent';
      btnExportPdfTab.style.color = '#64748b';
      btnExportPdfTab.style.boxShadow = 'none';
    } else {
      btnExportPdfTab.style.background = 'white';
      btnExportPdfTab.style.color = '#00bcd4';
      btnExportPdfTab.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      btnExportCsvTab.style.background = 'transparent';
      btnExportCsvTab.style.color = '#64748b';
      btnExportCsvTab.style.boxShadow = 'none';
    }
    // Update the generate button label
    const btnGen = document.getElementById('btn-generar-csv');
    if (btnGen) {
      const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
      btnGen.innerHTML = `${icon} Generar Reporte ${selectedExportFormat.toUpperCase()}`;
    }
  }

  if (btnExportCsvTab) {
    btnExportCsvTab.addEventListener('click', () => {
      selectedExportFormat = 'csv';
      updateFormatToggle();
    });
  }
  if (btnExportPdfTab) {
    btnExportPdfTab.addEventListener('click', () => {
      selectedExportFormat = 'pdf';
      updateFormatToggle();
    });
  }

  if (btnGenerarReporteCentro && generarReporteCentrosList) {
    btnGenerarReporteCentro.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = generarReporteCentrosList.style.display !== 'none';
      if (!isOpen) populateGenerarReporteCentros();
      generarReporteCentrosList.style.display = isOpen ? 'none' : 'block';
      if (generarReporteCentroChevron) {
        generarReporteCentroChevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (generarReporteCentrosList &&
        !generarReporteCentrosList.contains(e.target) &&
        btnGenerarReporteCentro && !btnGenerarReporteCentro.contains(e.target)) {
      generarReporteCentrosList.style.display = 'none';
      if (generarReporteCentroChevron) {
        generarReporteCentroChevron.style.transform = 'rotate(0deg)';
      }
    }
  });

  async function populateGenerarReporteCentros() {
    if (!generarReporteCentrosList) return;
    try {
      if (!allCentrosData || allCentrosData.length === 0) {
        const { data, error } = await supabase.from('centros').select('id, nombre').order('nombre', { ascending: true });
        if (error) throw error;
        allCentrosData = data || [];
      }
      
      if (allCentrosData.length === 0) {
        generarReporteCentrosList.innerHTML = `<div style="padding:0.9rem 1rem;font-size:0.95rem;color:#94a3b8;text-align:center;">No hay centros</div>`;
        return;
      }

      generarReporteCentrosList.innerHTML = allCentrosData.map((c, i) => {
        const isSelected = selectedGenerarReporteCentroId === c.id;
        const isLast = i === allCentrosData.length - 1;
        return `
          <div class="generar-reporte-centro-item" data-id="${c.id}" data-name="${c.nombre}"
            style="display:flex;align-items:center;justify-content:space-between;
                   padding:0.9rem 1rem;font-size:0.95rem;color:#1e293b;cursor:pointer;
                   ${!isLast ? 'border-bottom:1px solid #f1f5f9;' : ''}">
            <span>${c.nombre}</span>
            ${isSelected ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </div>`;
      }).join('');

      generarReporteCentrosList.querySelectorAll('.generar-reporte-centro-item').forEach(item => {
        item.addEventListener('click', () => {
          selectedGenerarReporteCentroId = item.dataset.id;
          if (generarReporteCentroText) {
            generarReporteCentroText.textContent = item.dataset.name;
            generarReporteCentroText.style.color = '#1e293b';
          }
          const resumenCentro = document.getElementById('resumen-centro-text');
          if (resumenCentro) resumenCentro.textContent = item.dataset.name;
          generarReporteCentrosList.style.display = 'none';
          if (generarReporteCentroChevron) generarReporteCentroChevron.style.transform = 'rotate(0deg)';
        });
      });
    } catch (err) {
      console.error('Error loading centros for generar reporte:', err.message);
    }
  }

  const generarDesdeInput = document.getElementById('generar-reporte-desde');
  const generarHastaInput = document.getElementById('generar-reporte-hasta');
  const resumenPeriodoText = document.getElementById('resumen-periodo-text');

  function updateResumenPeriodo() {
    if (resumenPeriodoText && generarDesdeInput && generarHastaInput) {
      resumenPeriodoText.textContent = `${generarDesdeInput.value || '-'} - ${generarHastaInput.value || '-'}`;
    }
  }

  if (generarDesdeInput) generarDesdeInput.addEventListener('input', updateResumenPeriodo);
  if (generarHastaInput) generarHastaInput.addEventListener('input', updateResumenPeriodo);

  // --- STEP 1 TO STEP 2 LOGIC ---
  const btnSiguienteReporte = document.getElementById('btn-siguiente-reporte');
  const btnAnteriorReporte = document.getElementById('btn-anterior-reporte');
  
  const stepParametrosContent = document.getElementById('step-parametros-content');
  const stepColumnasContent = document.getElementById('step-columnas-content');
  const footerParametros = document.getElementById('footer-parametros');
  const footerColumnas = document.getElementById('footer-columnas');
  
  const stepper1Circle = document.getElementById('stepper-1-circle');
  const stepper1Text = document.getElementById('stepper-1-text');
  const stepper2Circle = document.getElementById('stepper-2-circle');
  const stepper2Text = document.getElementById('stepper-2-text');

  if (btnSiguienteReporte) {
    btnSiguienteReporte.addEventListener('click', () => {
      if (!selectedGenerarReporteCentroId) {
        alert("Por favor selecciona un centro para el reporte.");
        return;
      }
      if (stepParametrosContent) stepParametrosContent.style.display = 'none';
      if (stepColumnasContent) stepColumnasContent.style.display = 'block';
      if (footerParametros) footerParametros.style.display = 'none';
      if (footerColumnas) footerColumnas.style.display = 'flex';
      
      if (stepper2Circle) {
        stepper2Circle.style.background = '#00bcd4';
        stepper2Circle.style.color = 'white';
      }
      if (stepper2Text) {
        stepper2Text.style.color = '#00bcd4';
      }
    });
  }

  if (btnAnteriorReporte) {
    btnAnteriorReporte.addEventListener('click', () => {
      if (stepColumnasContent) stepColumnasContent.style.display = 'none';
      if (stepParametrosContent) stepParametrosContent.style.display = 'block';
      if (footerColumnas) footerColumnas.style.display = 'none';
      if (footerParametros) footerParametros.style.display = 'block';
      
      if (stepper2Circle) {
        stepper2Circle.style.background = '#f1f5f9';
        stepper2Circle.style.color = '#94a3b8';
      }
      if (stepper2Text) {
        stepper2Text.style.color = '#94a3b8';
      }
    });
  }

  // --- COLUMNAS CONFIGURATION LOGIC ---
  let columnasDisponibles = [
    { id: 'col-cliente', label: 'Nombre del Cliente', selected: true },
    { id: 'col-nif', label: 'NIF', selected: true },
    { id: 'col-fecha', label: 'Fecha', selected: true },
    { id: 'col-concepto', label: 'Concepto', selected: true },
    { id: 'col-importe', label: 'Importe', selected: true },
    { id: 'col-centro', label: 'Centro', selected: true },
    { id: 'col-procedimiento', label: 'Procedimiento', selected: true },
    { id: 'col-telefono', label: 'Teléfono', selected: true },
    { id: 'col-email', label: 'Email', selected: true },
    { id: 'col-nacimiento', label: 'Fecha de Nacimiento', selected: true },
    { id: 'col-genero', label: 'Género', selected: true },
    { id: 'col-metodo-pago', label: 'Método de pago', selected: false },
    { id: 'col-pagado', label: 'Pagado', selected: false },
  ];

  function renderColumnas() {
    const listContainer = document.getElementById('columnas-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = columnasDisponibles.map(col => {
      const isSelected = col.selected;
      
      const tickHtml = isSelected
        ? `<div class="columna-tick" data-id="${col.id}" style="width: 22px; height: 22px; border-radius: 50%; background: #00bcd4; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
           </div>`
        : `<div class="columna-tick" data-id="${col.id}" style="width: 22px; height: 22px; border-radius: 50%; background: transparent; border: 2px solid #e2e8f0; box-sizing: border-box; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;"></div>`;

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; background: #f1f5f9; padding: 0.8rem 1rem; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 0.75rem; color: ${isSelected ? '#334155' : '#94a3b8'}; font-size: 0.95rem; transition: color 0.2s;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="cursor: grab;"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            ${col.label}
          </div>
          ${tickHtml}
        </div>
      `;
    }).join('');

    listContainer.querySelectorAll('.columna-tick').forEach(tick => {
      tick.addEventListener('click', () => {
        const colId = tick.dataset.id;
        const col = columnasDisponibles.find(c => c.id === colId);
        if (col) {
          col.selected = !col.selected;
          renderColumnas();
        }
      });
    });
  }

  // Initial draw
  renderColumnas();

  const btnGenerarCsv = document.getElementById('btn-generar-csv');
  if (btnGenerarCsv) {
    btnGenerarCsv.addEventListener('click', async () => {
      if (!selectedGenerarReporteCentroId) {
        alert("Por favor selecciona un centro para el reporte.");
        return;
      }
      
      const titleEl = document.getElementById('generar-reporte-centro-text');
      const titulo = titleEl ? titleEl.textContent : 'Nuevo Reporte';
      const fechaInicio = generarDesdeInput ? generarDesdeInput.value : '';
      const fechaFin = generarHastaInput ? generarHastaInput.value : '';
      
      const columns = columnasDisponibles.filter(c => c.selected).map(c => c.id);
      
      btnGenerarCsv.disabled = true;
      btnGenerarCsv.innerHTML = 'Generando...';

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No hay sesión activa');

        const { error } = await supabase
          .from('reportes')
          .insert({
            titulo: titulo,
            tipo: 'general',
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            datos: { centro_id: selectedGenerarReporteCentroId, columns, formato: selectedExportFormat },
            user_id: user.id
          });

        if (error) throw error;

        // Navigate to Reportes list and refresh
        switchToView('Reportes');
        await loadReportes();
        
        // Reset steps
        if (btnAnteriorReporte) btnAnteriorReporte.click();
        
      } catch (err) {
        alert('Error al generar reporte: ' + err.message);
      } finally {
        btnGenerarCsv.disabled = false;
        btnGenerarCsv.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Generar Reporte CSV
        `;
      }
    });
  }

  // ---- FILTER PANEL LOGIC ----
  const btnFiltrarReportes = document.getElementById('btn-filtrar-reportes');
  const reportesFilterPanel = document.getElementById('reportes-filter-panel');
  let filtroSelectedCentroId = null; // null = todas las clínicas
  let filtroDesde = '';
  let filtroHasta = '';

  if (btnFiltrarReportes && reportesFilterPanel) {
    btnFiltrarReportes.addEventListener('click', () => {
      const isVisible = reportesFilterPanel.style.display !== 'none';
      if (isVisible) {
        reportesFilterPanel.style.display = 'none';
      } else {
        reportesFilterPanel.style.display = 'flex';
        populateCentrosDropdown();
      }
    });
  }

  const btnCentroDropdown = document.getElementById('btn-centro-dropdown');
  const centrosDropdownList = document.getElementById('centros-dropdown-list');
  const centroDropdownChevron = document.getElementById('centro-dropdown-chevron');

  if (btnCentroDropdown && centrosDropdownList) {
    btnCentroDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = centrosDropdownList.style.display !== 'none';
      centrosDropdownList.style.display = isOpen ? 'none' : 'block';
      if (centroDropdownChevron) {
        centroDropdownChevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (centrosDropdownList &&
        !centrosDropdownList.contains(e.target) &&
        btnCentroDropdown && !btnCentroDropdown.contains(e.target)) {
      centrosDropdownList.style.display = 'none';
      if (centroDropdownChevron) centroDropdownChevron.style.transform = 'rotate(0deg)';
    }
  });

  async function populateCentrosDropdown() {
    if (!centrosDropdownList) return;
    try {
      const { data: centros, error } = await supabase
        .from('centros')
        .select('id, nombre')
        .order('nombre', { ascending: true });
      if (error) throw error;

      const items = [{ id: null, nombre: 'Todas las clínicas' }, ...(centros || [])];
      centrosDropdownList.innerHTML = items.map((c, i) => {
        const isSelected = filtroSelectedCentroId === c.id;
        const isLast = i === items.length - 1;
        return `
          <div class="centro-dropdown-item" data-id="${c.id || ''}"
            style="display:flex;align-items:center;justify-content:space-between;
                   padding:0.9rem 1rem;font-size:0.95rem;color:#1e293b;cursor:pointer;
                   ${!isLast ? 'border-bottom:1px solid #f1f5f9;' : ''}">
            <span>${c.nombre}</span>
            ${isSelected ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </div>`;
      }).join('');

      centrosDropdownList.querySelectorAll('.centro-dropdown-item').forEach(item => {
        item.addEventListener('click', () => {
          const rawId = item.dataset.id;
          filtroSelectedCentroId = rawId === '' ? null : rawId;
          centrosDropdownList.style.display = 'none';
          if (centroDropdownChevron) centroDropdownChevron.style.transform = 'rotate(0deg)';
          populateCentrosDropdown();
          applyReporteFilters();
        });
      });
    } catch (err) {
      console.error('Error loading centros for filter:', err.message);
    }
  }

  const filtroDesdeInput = document.getElementById('filtro-reporte-desde');
  const filtroHastaInput = document.getElementById('filtro-reporte-hasta');
  if (filtroDesdeInput) {
    filtroDesdeInput.addEventListener('change', (e) => { filtroDesde = e.target.value; applyReporteFilters(); });
  }
  if (filtroHastaInput) {
    filtroHastaInput.addEventListener('change', (e) => { filtroHasta = e.target.value; applyReporteFilters(); });
  }

  const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros-reportes');
  if (btnLimpiarFiltros) {
    btnLimpiarFiltros.addEventListener('click', () => {
      filtroSelectedCentroId = null;
      filtroDesde = '';
      filtroHasta = '';
      if (filtroDesdeInput) filtroDesdeInput.value = '';
      if (filtroHastaInput) filtroHastaInput.value = '';
      populateCentrosDropdown();
      renderReportesList(allReportesData);
    });
  }

  function applyReporteFilters() {
    let result = [...allReportesData];
    if (filtroSelectedCentroId) {
      result = result.filter(r => r.datos && r.datos.centro_id === filtroSelectedCentroId);
    }
    if (filtroDesde) {
      result = result.filter(r => new Date(r.created_at) >= new Date(filtroDesde));
    }
    if (filtroHasta) {
      const hasta = new Date(filtroHasta);
      hasta.setHours(23, 59, 59, 999);
      result = result.filter(r => new Date(r.created_at) <= hasta);
    }
    renderReportesList(result);
  }

  const btnSaveReporte = document.getElementById('btn-save-reporte');
  if (btnSaveReporte) {
    btnSaveReporte.addEventListener('click', async () => {
      const titulo = document.getElementById('reporte-titulo').value.trim();
      const tipo = document.getElementById('reporte-tipo').value;
      const fechaInicio = document.getElementById('reporte-fecha-inicio').value;
      const fechaFin = document.getElementById('reporte-fecha-fin').value;
      const descripcion = document.getElementById('reporte-descripcion').value.trim();

      if (!titulo) {
        alert('El título del reporte es obligatorio');
        return;
      }

      btnSaveReporte.disabled = true;
      btnSaveReporte.textContent = 'Guardando...';

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No hay sesión activa');

        let error;
        if (editingReporteId) {
          const { error: err } = await supabase
            .from('reportes')
            .update({ titulo, tipo, fecha_inicio: fechaInicio || null, fecha_fin: fechaFin || null, descripcion })
            .eq('id', editingReporteId);
          error = err;
        } else {
          const { error: err } = await supabase
            .from('reportes')
            .insert({ titulo, tipo, fecha_inicio: fechaInicio || null, fecha_fin: fechaFin || null, descripcion, user_id: user.id });
          error = err;
        }

        if (error) throw error;

        editingReporteId = null;

        if (modalSuccess) {
          successModalDestination = 'Reportes';
          modalSuccess.querySelector('p').textContent = editingReporteId ? 'Reporte actualizado con éxito' : 'Reporte creado con éxito';
          modalSuccess.querySelector('p').textContent = 'Reporte guardado con éxito';
          modalSuccess.style.display = 'flex';
        } else {
          switchToView('Reportes');
        }
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        btnSaveReporte.disabled = false;
        btnSaveReporte.textContent = 'Guardar Reporte';
      }
    });
  }

  async function loadReportes() {
    try {
      let query = supabase
        .from('reportes')
        .select('*');

      if (globalCentroFilterId) {
        // Filter reports where the metadata 'centro_id' in JSONB matches
        query = query.eq('datos->>centro_id', globalCentroFilterId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      allReportesData = data || [];
      applyReporteFilters();
    } catch (err) {
      console.error('Error loading reportes:', err.message);
    }
  }

  function renderReportesList(reportes) {
    const list = document.getElementById('reportes-list');
    if (!list) return;

    if (!reportes || reportes.length === 0) {
      list.style.justifyContent = 'center';
      list.style.alignItems = 'center';
      list.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:0.75rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
          <p style="margin:0;color:#64748b;font-size:1rem;font-weight:600;">No hay reportes</p>
          <p style="margin:0;color:#94a3b8;font-size:0.9rem;">Crea tu primer reporte para comenzar</p>
        </div>
      `;
      return;
    }

    list.style.justifyContent = 'flex-start';
    list.style.alignItems = 'stretch';
    list.innerHTML = '';

    reportes.forEach(reporte => {
      const fechaCreacion = new Date(reporte.created_at);
      const fechaStr = `${fechaCreacion.getDate()}/${fechaCreacion.getMonth() + 1}/${fechaCreacion.getFullYear()}`;
      
      const formatFechaDisplay = (dateString) => {
        if (!dateString) return '-';
        const parts = dateString.split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateString;
      };

      const card = document.createElement('div');
      card.style.cssText = `
        background: white; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.05); width: 100%; box-sizing: border-box;
      `;

      const formato = (reporte.datos && reporte.datos.formato) ? reporte.datos.formato.toUpperCase() : 'CSV';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <h3 style="margin: 0; font-size: 1.1rem; color: #1e293b;">Reporte de ${reporte.titulo}</h3>
          <span style="background: #00bcd4; color: white; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.75rem; font-weight: bold;">${formato}</span>
        </div>
        
        <div style="display: flex; align-items: center; gap: 0.5rem; color: #94a3b8; font-size: 0.85rem; margin-bottom: 1rem;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>${formatFechaDisplay(reporte.fecha_inicio)} - ${formatFechaDisplay(reporte.fecha_fin)}</span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 1rem;">
          <span style="color: #94a3b8; font-size: 0.8rem;">Creada: ${fechaStr}</span>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn-delete-reporte" style="background: #fee2e2; color: #ef4444; border: none; padding: 0.5rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Eliminar">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
            <button class="btn-export-reporte" style="background: #00bcd4; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: bold; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Descargar
            </button>
          </div>
        </div>
      `;

      // Export CSV
      const btnExport = card.querySelector('.btn-export-reporte');
      if (btnExport) {
        btnExport.addEventListener('click', async (e) => {
          e.stopPropagation();
          
          const originalHtml = btnExport.innerHTML;
          btnExport.innerHTML = '...';
          btnExport.disabled = true;

          try {
            // 1. Prepare query for appointments
            let query = supabase
              .from('appointments')
              .select('*, clients(nombre_completo, nif, fecha_nacimiento, genero, email, telefono), centros(nombre), procedimientos(nombre)')
              .order('created_at', { ascending: false });

            // Filter by center if selected
            if (reporte.datos && reporte.datos.centro_id) {
              query = query.eq('centro_id', reporte.datos.centro_id);
            }

            // Filter by date range (inclusive)
            if (reporte.fecha_inicio) {
              query = query.gte('created_at', `${reporte.fecha_inicio}T00:00:00.000Z`);
            }
            if (reporte.fecha_fin) {
              query = query.lte('created_at', `${reporte.fecha_fin}T23:59:59.999Z`);
            }

            const { data: appointments, error } = await query;
            
            if (error) throw error;

            // 2. Prepare columns configuration
            const columnsConfig = {
              'col-cliente': { header: 'Nombre del Cliente', getValue: apt => apt.clients ? apt.clients.nombre_completo : '' },
              'col-nif': { header: 'NIF', getValue: apt => apt.clients ? apt.clients.nif : '' },
              'col-fecha': { header: 'Fecha', getValue: apt => new Date(apt.created_at).toLocaleDateString('es-ES') },
              'col-concepto': { header: 'Concepto', getValue: apt => apt.concepto || '' },
              'col-importe': { header: 'Importe', getValue: apt => apt.precio ? `${apt.precio} €` : '' },
              'col-centro': { header: 'Centro', getValue: apt => apt.centros ? apt.centros.nombre : '' },
              'col-procedimiento': { header: 'Procedimiento', getValue: apt => apt.procedimientos ? apt.procedimientos.nombre : '' },
              'col-telefono': { header: 'Teléfono', getValue: apt => apt.clients ? apt.clients.telefono : '' },
              'col-email': { header: 'Email', getValue: apt => apt.clients ? apt.clients.email : '' },
              'col-nacimiento': { header: 'Fecha de Nacimiento', getValue: apt => apt.clients && apt.clients.fecha_nacimiento ? new Date(apt.clients.fecha_nacimiento).toLocaleDateString('es-ES') : '' },
              'col-genero': { header: 'Género', getValue: apt => apt.clients ? apt.clients.genero : '' },
              'col-metodo-pago': { header: 'Método de pago', getValue: apt => apt.pago_metodo || '' },
              'col-pagado': { header: 'Estado Pago', getValue: apt => apt.pago_estado || '' },
            };

            const selectedColIds = (reporte.datos && reporte.datos.columns) ? reporte.datos.columns : Object.keys(columnsConfig);
            const activeCols = selectedColIds.map(id => columnsConfig[id]).filter(Boolean);

            // 3. Build rows
            const rows = [];
            rows.push(activeCols.map(col => col.header));
            if (appointments && appointments.length > 0) {
              appointments.forEach(apt => {
                rows.push(activeCols.map(col => col.getValue(apt)));
              });
            } else {
              rows.push(['No hay datos para el rango y filtros seleccionados']);
            }

            // 4. Export based on format
            const reporteFormato = (reporte.datos && reporte.datos.formato) ? reporte.datos.formato : 'csv';

            if (reporteFormato === 'pdf') {
              // --- PDF export ---
              const { jsPDF } = window.jspdf;
              const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

              // Title block
              doc.setFontSize(18);
              doc.setTextColor(0, 188, 212);
              doc.text(`Reporte de ${reporte.titulo}`, 40, 50);

              doc.setFontSize(10);
              doc.setTextColor(100, 116, 139);
              const formatFecha = (d) => { if (!d) return '-'; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };
              doc.text(`Período: ${formatFecha(reporte.fecha_inicio)} - ${formatFecha(reporte.fecha_fin)}`, 40, 68);
              doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 40, 82);

              // Table
              doc.autoTable({
                head: [rows[0]],
                body: rows.slice(1),
                startY: 100,
                styles: { fontSize: 9, cellPadding: 5 },
                headStyles: { fillColor: [0, 188, 212], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 40, right: 40 },
              });

              doc.save(`reporte_${reporte.titulo.replace(/\s+/g,'_')}.pdf`);

            } else {
              // --- CSV export ---
              const csvContent = rows.map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
              const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
              const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `reporte_${reporte.titulo.replace(/\s+/g,'_')}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }

            
          } catch (err) {
            console.error(err);
            alert('Error al exportar datos: ' + err.message);
          } finally {
            btnExport.disabled = false;
            btnExport.innerHTML = originalHtml;
          }
        });
      }

      // Delete
      card.querySelector('.btn-delete-reporte').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`¿Eliminar el reporte "${reporte.titulo}"?`)) {
          try {
            const { error } = await supabase.from('reportes').delete().eq('id', reporte.id);
            if (error) throw error;
            loadReportes();
          } catch (err) {
            alert('Error al eliminar: ' + err.message);
          }
        }
      });

      list.appendChild(card);
    });
  }
  // --- APPOINTMENT SYSTEM LOGIC ---
  let selectedAptClient = null;
  let selectedAptCentro = null;
  let selectedAptProc = null;

  async function loadAppointmentData() {
    // Populate Clients
    const clientList = document.getElementById('cita-clientes-list');
    if (clientList) {
      try {
        let query = supabase.from('clients').select('*');
        if (globalCentroFilterId) {
          query = query.eq('centro_id', globalCentroFilterId);
        }
        const { data: clients } = await query.order('nombre_completo');
        if (clients) {
          clientList.innerHTML = clients.map(c => `
            <div class="dropdown-item" data-id="${c.id}" data-name="${c.nombre_completo}" style="padding: 0.85rem 1rem; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; color: #1e293b;">
              ${c.nombre_completo}
            </div>
          `).join('');
          
          clientList.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
              e.stopPropagation();
              selectedAptClient = { id: item.dataset.id, name: item.dataset.name };
              const unselected = document.getElementById('wrapper-cliente-unselected');
              const selected = document.getElementById('wrapper-cliente-selected');
              const nameEl = document.getElementById('cita-selected-cliente-name');
              
              if (unselected && selected && nameEl) {
                unselected.style.display = 'none';
                selected.style.display = 'flex';
                nameEl.textContent = selectedAptClient.name;
              }
              clientList.style.display = 'none';
              const chevron = document.getElementById('cita-cliente-chevron');
              if (chevron) chevron.style.transform = 'rotate(0deg)';
            });
          });
        }
      } catch (err) { console.error(err); }
    }

    // Populate Centers
    const centroList = document.getElementById('cita-centros-list');
    if (centroList) {
      try {
        const { data: centros } = await supabase.from('centros').select('*').order('nombre');
        if (centros) {
          // Pre-select if global filter is active
          if (globalCentroFilterId) {
            const current = centros.find(c => c.id === globalCentroFilterId);
            if (current) {
              selectedAptCentro = { id: current.id, name: current.nombre };
              const textEl = document.getElementById('cita-centro-text');
              if (textEl) {
                textEl.textContent = current.nombre;
                textEl.style.color = '#334155';
              }
            }
          }

          centroList.innerHTML = centros.map(c => `
            <div class="dropdown-item" data-id="${c.id}" data-name="${c.nombre}" style="padding: 0.85rem 1rem; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; color: #1e293b;">
              ${c.nombre}
            </div>
          `).join('');
          
          centroList.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
              e.stopPropagation();
              selectedAptCentro = { id: item.dataset.id, name: item.dataset.name };
              const textEl = document.getElementById('cita-centro-text');
              if (textEl) {
                textEl.textContent = selectedAptCentro.name;
                textEl.style.color = '#334155';
              }
              centroList.style.display = 'none';
              const chevron = document.getElementById('cita-centro-chevron');
              if (chevron) chevron.style.transform = 'rotate(0deg)';
            });
          });
        }
      } catch (err) { console.error(err); }
    }

    // Populate Procedures
    const procList = document.getElementById('cita-procedimientos-list');
    if (procList) {
      try {
        const { data: procs } = await supabase.from('procedimientos').select('*').order('nombre');
        if (procs) {
          procList.innerHTML = procs.map(p => `
            <div class="dropdown-item" data-id="${p.id}" data-name="${p.nombre}" style="padding: 0.85rem 1rem; cursor: pointer; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; color: #1e293b;">
              ${p.nombre}
            </div>
          `).join('');
          
          procList.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
              e.stopPropagation();
              selectedAptProc = { id: item.dataset.id, name: item.dataset.name };
              const textEl = document.getElementById('cita-procedimiento-text');
              if (textEl) {
                textEl.textContent = selectedAptProc.name;
              }
              procList.style.display = 'none';
              const chevron = document.getElementById('cita-procedimiento-chevron');
              if (chevron) chevron.style.transform = 'rotate(0deg)';
            });
          });
        }
      } catch (err) { console.error(err); }
    }
  }

  // Dropdown toggles
  const setupAptDropdown = (btnId, listId, chevronId) => {
    const btn = document.getElementById(btnId);
    const list = document.getElementById(listId);
    const chevron = document.getElementById(chevronId);
    if (!btn || !list) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = list.style.display === 'block';
      // Close all first
      document.querySelectorAll('#cita-clientes-list, #cita-centros-list, #cita-procedimientos-list').forEach(l => l.style.display = 'none');
      document.querySelectorAll('#cita-cliente-chevron, #cita-centro-chevron, #cita-procedimiento-chevron').forEach(c => c.style.transform = 'rotate(0deg)');
      
      if (!isOpen) {
        list.style.display = 'block';
        if (chevron) chevron.style.transform = 'rotate(180deg)';
      }
    });
  };

  setupAptDropdown('btn-cita-cliente', 'cita-clientes-list', 'cita-cliente-chevron');
  setupAptDropdown('btn-cita-centro', 'cita-centros-list', 'cita-centro-chevron');
  setupAptDropdown('btn-cita-procedimiento', 'cita-procedimientos-list', 'cita-procedimiento-chevron');

  document.addEventListener('click', () => {
    document.querySelectorAll('#cita-clientes-list, #cita-centros-list, #cita-procedimientos-list').forEach(l => l.style.display = 'none');
    document.querySelectorAll('#cita-cliente-chevron, #cita-centro-chevron, #cita-procedimiento-chevron').forEach(c => c.style.transform = 'rotate(0deg)');
  });

  const btnCambiarClient = document.getElementById('btn-cambiar-cliente');
  if (btnCambiarClient) {
    btnCambiarClient.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedAptClient = null;
      document.getElementById('wrapper-cliente-unselected').style.display = 'block';
      document.getElementById('wrapper-cliente-selected').style.display = 'none';
    });
  }

  // Payment pill logic (Creation) - Initializing variables
  createMethodBtns = document.querySelectorAll('.create-method-btn');
  createStatusBtns = document.querySelectorAll('.create-status-btn');
  createPrecioInput = document.getElementById('create-cita-precio');
  createConceptoInput = document.getElementById('create-cita-concepto');
  createNotasTextarea = document.getElementById('create-cita-notas');
  btnVoiceNoteCreate = document.getElementById('btn-voice-note-create');

  if (createPrecioInput) {
    createPrecioInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9.]/g, '');
      if ((e.target.value.match(/\./g) || []).length > 1) {
        e.target.value = e.target.value.replace(/\.+$/, "");
      }
    });
  }

  createMethodBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedCreateAptMethod = btn.dataset.method;
      updateCreateSelectionUI();
    });
  });

  createStatusBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedCreateAptStatus = btn.dataset.status;
      updateCreateSelectionUI();
    });
  });

  function updateCreateSelectionUI() {
    createMethodBtns.forEach(btn => {
      if (btn.dataset.method === selectedCreateAptMethod) {
        btn.classList.add('active-method');
      } else {
        btn.classList.remove('active-method');
      }
    });

    createStatusBtns.forEach(btn => {
      if (btn.dataset.status === selectedCreateAptStatus) {
        if (selectedCreateAptStatus === 'Pagado') {
          btn.classList.add('active-status-pagado');
          btn.classList.remove('active-status-pendiente');
        } else {
          btn.classList.add('active-status-pendiente');
          btn.classList.remove('active-status-pagado');
        }
      } else {
        btn.classList.remove('active-status-pagado');
        btn.classList.remove('active-status-pendiente');
      }
    });
  }

  // Voice Note Logic (Creation)
  if (btnVoiceNoteCreate && createNotasTextarea && SpeechRecognition) {
    const recognitionCreate = new SpeechRecognition();
    recognitionCreate.lang = 'es-ES';
    recognitionCreate.continuous = true;
    recognitionCreate.interimResults = true;

    let isListeningCreate = false;
    let baseTextCreate = '';

    recognitionCreate.onstart = () => {
      isListeningCreate = true;
      baseTextCreate = createNotasTextarea.value + (createNotasTextarea.value ? ' ' : '');
      btnVoiceNoteCreate.style.background = '#00bcd4';
      btnVoiceNoteCreate.querySelector('svg').style.stroke = 'white';
      btnVoiceNoteCreate.style.boxShadow = '0 0 15px rgba(0, 188, 212, 0.5)';
    };

    recognitionCreate.onend = () => {
      isListeningCreate = false;
      btnVoiceNoteCreate.style.background = '#f8fafc';
      btnVoiceNoteCreate.querySelector('svg').style.stroke = '#64748b';
      btnVoiceNoteCreate.style.boxShadow = 'none';
    };

    recognitionCreate.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) {
        createNotasTextarea.value = baseTextCreate + finalTranscript;
        baseTextCreate = createNotasTextarea.value + ' ';
      } else {
        createNotasTextarea.value = baseTextCreate + interimTranscript;
      }
      createNotasTextarea.scrollTop = createNotasTextarea.scrollHeight;
    };

    btnVoiceNoteCreate.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isListeningCreate) recognitionCreate.stop();
      else recognitionCreate.start();
    });
  }

  const btnSubmitCita = document.getElementById('btn-submit-cita');
  if (btnSubmitCita) {
    btnSubmitCita.addEventListener('click', async () => {
      if (!selectedAptClient) { alert('Selecciona un cliente'); return; }
      if (!selectedAptCentro) { alert('Selecciona un centro'); return; }
      if (!selectedAptProc) { alert('Selecciona un procedimiento'); return; }

      btnSubmitCita.disabled = true;
      btnSubmitCita.textContent = 'Guardando...';

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No hay sesión activa');
        
        // Basic insert - table structure might vary but this covers the UI state
        const { error } = await supabase.from('appointments').insert([{
          client_id: selectedAptClient.id,
          centro_id: selectedAptCentro.id,
          procedure_id: selectedAptProc.id,
          precio: parseFloat(createPrecioInput.value) || 0,
          pago_metodo: selectedCreateAptMethod,
          pago_estado: selectedCreateAptStatus,
          concepto: createConceptoInput.value.trim(),
          notas: createNotasTextarea.value.trim(),
          user_id: user.id
        }]);

        if (error) throw error;
        
        alert('¡Cita creada con éxito!');
        // Refresh list and go back
        loadAppointments();
        switchToView('Citas');
      } catch (err) {
        alert('Error al crear cita: ' + err.message);
      } finally {
        btnSubmitCita.disabled = false;
        btnSubmitCita.textContent = 'Crear cita';
      }
    });
  }

  const btnBackDetallesCita = document.querySelector('.btn-back-detalles-cita');
  if (btnBackDetallesCita) {
    btnBackDetallesCita.addEventListener('click', () => {
      hideAllViews();
      dashboardView.style.display = 'flex';
      switchToView('Citas');
    });
  }

  async function showAppointmentDetails(id) {
    console.log('Mostrando detalles de cita:', id);
    hideAllViews();
    const view = document.getElementById('view-detalles-cita');
    if (view) {
      view.style.display = 'flex';
      console.log('Vista de detalles mostrada');
    } else {
      console.error('No se encontró el elemento view-detalles-cita');
    }

    try {
      const { data: apt, error } = await supabase
        .from('appointments')
        .select('*, clients(*), procedimientos(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      console.log('Datos de cita cargados:', apt);

      const date = new Date(apt.created_at);
      const fechaTxt = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
      const horaTxt = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      document.getElementById('det-cita-fecha').textContent = fechaTxt.charAt(0).toUpperCase() + fechaTxt.slice(1);
      document.getElementById('det-cita-hora').textContent = horaTxt;
      document.getElementById('det-cita-paciente').textContent = apt.clients ? apt.clients.nombre_completo : 'N/A';
      document.getElementById('det-cita-procedimiento').textContent = apt.procedimientos ? apt.procedimientos.nombre : 'N/A';
      document.getElementById('det-cita-precio').textContent = apt.precio ? `${apt.precio} €` : '--';
      document.getElementById('det-cita-metodo').textContent = apt.pago_metodo || 'Tarjeta';
      document.getElementById('det-cita-estado').textContent = apt.pago_estado || 'Pendiente';
      document.getElementById('det-cita-concepto').textContent = apt.concepto || '--';
      document.getElementById('det-cita-notas').textContent = apt.notas || 'No hay notas para esta cita';
      
      const toggle = document.getElementById('det-cita-completada-toggle');
      if (toggle) {
        toggle.checked = apt.completada || false;
        // Re-bind to ensure it has the latest ID context
        toggle.onchange = async () => {
          console.log('Cambiando estado completada a:', toggle.checked);
          try {
            const { error } = await supabase
              .from('appointments')
              .update({ completada: toggle.checked })
              .eq('id', id);
            if (error) throw error;
          } catch (err) {
            alert('Error al actualizar: ' + err.message);
            toggle.checked = !toggle.checked; // Revert on error
          }
        };
      }

      const dot = document.getElementById('det-cita-estado-dot');
      if (dot) dot.style.background = apt.pago_estado === 'Pagado' ? '#22c55e' : '#f59e0b';
      const statusText = document.getElementById('det-cita-estado');
      if (statusText) statusText.style.color = apt.pago_estado === 'Pagado' ? '#22c55e' : '#f59e0b';

      // Load existing photos for this appointment in this session
      currentAptId = id;
      currentAptClientId = apt.client_id;
      renderAptPhotos();

      // Appointment Details Camera Button
      const btnAptCamera = document.getElementById('btn-apt-det-camera');
      if (btnAptCamera) {
        btnAptCamera.onclick = () => {
          currentImageContext = 'appointment';
          if (imageSourceModal) {
            imageSourceModal.style.display = 'flex';
          }
        };
      }
      // Edit Cobro logic
      const btnEditCobro = document.getElementById('btn-edit-cobro');
      if (btnEditCobro) {
        btnEditCobro.onclick = () => {
          editCobroModal.style.display = 'flex';
          editPrecioInput.value = apt.precio || '';
          editConceptoInput.value = apt.concepto || '';
          selectedEditCobroMethod = apt.pago_metodo || 'Tarjeta';
          selectedEditCobroStatus = apt.pago_estado || 'Pendiente';
          updateEditCobroSelectionUI();
        };
      }

      // Edit Notes logic
      const btnEditNotes = document.getElementById('btn-edit-apt-notes');
      if (btnEditNotes) {
        btnEditNotes.onclick = () => {
          editNotesModal.style.display = 'flex';
          notesTextarea.value = apt.notas || '';
        };
      }

      // Delete Appointment logic
      const btnDeleteApt = document.getElementById('btn-delete-apt');
      if (btnDeleteApt) {
        btnDeleteApt.onclick = async () => {
          if (confirm('¿Estás seguro de que deseas eliminar esta cita permanentemente?')) {
            try {
              const { error } = await supabase.from('appointments').delete().eq('id', id);
              if (error) throw error;
              alert('Cita eliminada con éxito');
              hideAllViews();
              loadAppointments();
            } catch (err) {
              alert('Error al eliminar la cita: ' + err.message);
            }
          }
        };
      }

      // Change Client/Procedure logic
      const patientRow = document.getElementById('det-cita-paciente-row');
      if (patientRow) {
        patientRow.onclick = () => openSelector('client', 'Seleccionar Cliente');
      }

      const procRow = document.getElementById('det-cita-procedimiento-row');
      if (procRow) {
        procRow.onclick = () => openSelector('procedure', 'Seleccionar Procedimiento');
      }

      renderAppointmentProducts();

    } catch (err) {
      console.error(err);
      alert('Error al cargar la cita: ' + err.message);
    }
  }

  async function dbUpdatePhoto(photoId, updates) {
    try {
      const { error } = await supabase
        .from('photos')
        .update(updates)
        .eq('id', photoId);
      if (error) throw error;
      console.log('Foto actualizada en DB:', photoId);
      await dbLoadPhotos();
    } catch (err) {
      console.error('Error al actualizar foto en DB:', err.message);
    }
  }

  function addAptPhoto(dataUrl, photoId = null) {
    if (!currentAptId) return;
    if (!currentAptPhotos[currentAptId]) {
      currentAptPhotos[currentAptId] = [];
    }
    
    // Evitar duplicados visuales locales
    if (!currentAptPhotos[currentAptId].includes(dataUrl)) {
      currentAptPhotos[currentAptId].unshift(dataUrl);
    }
    
    renderAptPhotos();
    
    if (photoId) {
      // Si ya tiene ID, es una foto de la galería que estamos vinculando
      dbUpdatePhoto(photoId, { appointment_id: currentAptId, client_id: currentAptClientId });
    } else {
      // Si no tiene ID, es una foto nueva (cámara o archivo)
      dbSavePhoto(dataUrl, currentAptClientId, currentAptId);
    }
  }

  function renderAptPhotos() {
    const container = document.getElementById('det-cita-fotos-container');
    const emptyState = document.getElementById('det-cita-fotos-empty');
    if (!container) return;

    // Clear previous photos (except empty state if needed)
    const photos = currentAptPhotos[currentAptId] || [];
    
    if (photos.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      // Remove any existing img elements
      container.querySelectorAll('.apt-photo-item').forEach(el => el.remove());
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    
    // Remove old ones to re-render
    container.querySelectorAll('.apt-photo-item').forEach(el => el.remove());

    photos.forEach(dataUrl => {
      const div = document.createElement('div');
      div.className = 'apt-photo-item';
      div.style.width = '80px';
      div.style.height = '80px';
      div.style.borderRadius = '12px';
      div.style.overflow = 'hidden';
      div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      
      div.appendChild(img);
      container.appendChild(div);
    });
  }


  async function loadAppointments() {
    const list = document.getElementById('citas-list');
    const container = document.getElementById('citas-container');
    const empty = document.getElementById('citas-empty-state');
    if (!list) return;

    try {
      let query = supabase
        .from('appointments')
        .select('*, clients(nombre_completo)')
        .order('created_at', { ascending: false });

      if (globalCentroFilterId) {
        query = query.eq('centro_id', globalCentroFilterId);
      }

      const { data, error } = await query;

      if (error) throw error;

      allAppointmentsData = data || [];

      if (!data || data.length === 0) {
        if (container) container.style.display = 'none';
        if (empty) empty.style.display = 'flex';
        return;
      }

      if (container) container.style.display = 'flex';
      if (empty) empty.style.display = 'none';

      list.innerHTML = data.map(apt => {
        const date = new Date(apt.created_at);
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        const clientName = apt.clients ? apt.clients.nombre_completo.split(' ')[0] : 'Cliente';

        return `
          <div class="cita-item" data-id="${apt.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 1.25rem; background: #f8fafc; border-radius: 14px; cursor: pointer; transition: background 0.2s; margin-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 1.5rem;">
              <span style="color: #00bcd4; font-weight: 700; font-size: 1.1rem; width: 55px;">${timeStr}</span>
              <span style="color: #1e293b; font-weight: 600; font-size: 1.05rem;">${clientName}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.cita-item').forEach(item => {
        item.onmouseenter = () => item.style.background = '#f1f5f9';
        item.onmouseleave = () => item.style.background = '#f8fafc';
        item.addEventListener('click', () => showAppointmentDetails(item.dataset.id));
      });

    } catch (err) {
      console.error('Error loading appointments:', err.message);
    }
  }


  // --- EDIT COBRO MODAL LOGIC ---
  let selectedEditCobroMethod = 'Tarjeta';
  let selectedEditCobroStatus = 'Pendiente';

  const editCobroModal = document.getElementById('edit-cobro-modal');
  const btnBackEditCobro = document.getElementById('btn-back-edit-cobro');
  const btnSaveEditCobro = document.getElementById('btn-save-edit-cobro');
  const editPrecioInput = document.getElementById('edit-cobro-precio');
  const editConceptoInput = document.getElementById('edit-cobro-concepto');

  const editMethodBtns = document.querySelectorAll('.method-btn');
  const editStatusBtns = document.querySelectorAll('.status-btn');

  if (btnBackEditCobro) {
    btnBackEditCobro.addEventListener('click', () => {
      editCobroModal.style.display = 'none';
    });
  }

  if (editPrecioInput) {
    editPrecioInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9.]/g, '');
      if ((e.target.value.match(/\./g) || []).length > 1) {
        e.target.value = e.target.value.replace(/\.+$/, "");
      }
    });
  }

  editMethodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedEditCobroMethod = btn.dataset.method;
      updateEditCobroSelectionUI();
    });
  });

  editStatusBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedEditCobroStatus = btn.dataset.status;
      updateEditCobroSelectionUI();
    });
  });

  function updateEditCobroSelectionUI() {
    editMethodBtns.forEach(btn => {
      if (btn.dataset.method === selectedEditCobroMethod) {
        btn.classList.add('active-method');
      } else {
        btn.classList.remove('active-method');
      }
    });

    editStatusBtns.forEach(btn => {
      if (btn.dataset.status === selectedEditCobroStatus) {
        if (selectedEditCobroStatus === 'Pagado') {
          btn.classList.add('active-status-pagado');
          btn.classList.remove('active-status-pendiente');
        } else {
          btn.classList.add('active-status-pendiente');
          btn.classList.remove('active-status-pagado');
        }
      } else {
        btn.classList.remove('active-status-pagado');
        btn.classList.remove('active-status-pendiente');
      }
    });
  }

  if (btnSaveEditCobro) {
    btnSaveEditCobro.addEventListener('click', async () => {
      const precio = parseFloat(editPrecioInput.value) || 0;
      const concepto = editConceptoInput.value.trim();

      btnSaveEditCobro.disabled = true;
      btnSaveEditCobro.textContent = 'Guardando...';

      try {
        const { error } = await supabase
          .from('appointments')
          .update({
            precio: precio,
            pago_metodo: selectedEditCobroMethod,
            pago_estado: selectedEditCobroStatus,
            concepto: concepto
          })
          .eq('id', currentAptId);

        if (error) throw error;

        editCobroModal.style.display = 'none';
        showAppointmentDetails(currentAptId); // Reload to reflect changes
        loadAppointments(); // Refresh list if needed
      } catch (err) {
        alert('Error al actualizar: ' + err.message);
      } finally {
        btnSaveEditCobro.disabled = false;
        btnSaveEditCobro.textContent = 'Guardar Cambios';
      }
    });
  }


  // --- ASIGNAR PRODUCTO LOGIC ---
  let assignableProducts = [];
  let selectedAptProducts = [];

  const assignProductModal = document.getElementById('assign-product-modal');
  const btnAddAssignProduct = document.getElementById('btn-add-assign-product');
  const btnBackAssignProduct = document.getElementById('btn-back-assign-product');
  const btnSaveAssignProduct = document.getElementById('btn-save-assign-product');
  const assignProductList = document.getElementById('assign-product-list');

  if (btnAddAssignProduct) {
    btnAddAssignProduct.addEventListener('click', async () => {
      assignProductModal.style.display = 'flex';
      await loadAssignableProducts();
      // Reset local state from current appointment products
      selectedAptProducts = await fetchAppointmentProducts(currentAptId);
      renderAssignableProducts();
    });
  }

  if (btnBackAssignProduct) {
    btnBackAssignProduct.addEventListener('click', () => {
      assignProductModal.style.display = 'none';
    });
  }

  async function loadAssignableProducts() {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('nombre', { ascending: true });
      if (error) throw error;
      assignableProducts = data;
    } catch (err) {
      console.error('Error loading products:', err.message);
    }
  }

  async function fetchAppointmentProducts(aptId) {
    try {
      const { data, error } = await supabase
        .from('appointment_products')
        .select('*')
        .eq('appointment_id', aptId);
      if (error) throw error;
      return data.map(ap => ({
        id: ap.id,
        product_id: ap.product_id,
        cantidad: ap.cantidad,
        unidad: ap.unidad,
        lote: ap.lote || ''
      }));
    } catch (err) {
      console.error('Error fetching appointment products:', err.message);
      return [];
    }
  }

  function renderAssignableProducts() {
    if (!assignProductList) return;
    assignProductList.innerHTML = '';

    assignableProducts.forEach(prod => {
      const isSelected = selectedAptProducts.some(p => p.product_id === prod.id);
      const selProd = selectedAptProducts.find(p => p.product_id === prod.id) || { cantidad: 1, unidad: 'Unidades', lote: '' };

      const card = document.createElement('div');
      card.style.background = 'white';
      card.style.borderRadius = '16px';
      card.style.padding = '1rem';
      card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
      card.style.transition = 'all 0.3s ease';
      card.style.cursor = 'pointer';
      card.style.marginBottom = '0.5rem';

      let innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: ${isSelected ? '#00bcd4' : '#e2e8f0'}; display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${isSelected ? 'white' : '#64748b'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </div>
          <span style="font-weight: 600; color: #1e293b; flex: 1;">${prod.nombre}</span>
        </div>
      `;

      if (isSelected) {
        innerHTML += `
          <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f1f5f9;">
            <div style="display: flex; justify-content: center; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem;">
              <button class="qty-btn minus" data-id="${prod.id}" style="width: 32px; height: 32px; border-radius: 50%; background: #00bcd4; border: none; color: white; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;">-</button>
              <span style="font-size: 1.1rem; font-weight: 700; color: #00bcd4;">${selProd.cantidad}</span>
              <button class="qty-btn plus" data-id="${prod.id}" style="width: 32px; height: 32px; border-radius: 50%; background: #00bcd4; border: none; color: white; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin-bottom: 0.4rem;">Seleccionar unidad</label>
              <select class="unit-select" data-id="${prod.id}" style="width: 100%; padding: 0.75rem; border-radius: 10px; border: 1.5px solid #e2e8f0; background: white; font-size: 0.95rem; color: #1e293b; outline: none;">
                <option value="Unidades" ${selProd.unidad === 'Unidades' ? 'selected' : ''}>Unidades</option>
                <option value="Píldoras" ${selProd.unidad === 'Píldoras' ? 'selected' : ''}>Píldoras</option>
                <option value="Mililitros" ${selProd.unidad === 'Mililitros' ? 'selected' : ''}>Mililitros</option>
                <option value="Miligramos" ${selProd.unidad === 'Miligramos' ? 'selected' : ''}>Miligramos</option>
                <option value="Gramos" ${selProd.unidad === 'Gramos' ? 'selected' : ''}>Gramos</option>
                <option value="Unidad Personalizada" ${selProd.unidad === 'Unidad Personalizada' ? 'selected' : ''}>Unidad Personalizada</option>
              </select>
            </div>

            <div style="position: relative;">
              <input type="text" class="lote-input" data-id="${prod.id}" placeholder="Introduce el número de lote" value="${selProd.lote}" style="width: 100%; padding: 0.75rem 2.5rem 0.75rem 0.75rem; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 0.95rem; outline: none; color: #1e293b;">
              <svg style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #00bcd4;" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2z"/><path d="M7 7h1v10H7z"/><path d="M10 7h2v10h-2z"/><path d="M14 7h1v10h-1z"/><path d="M17 7h1v10h-1z"/></svg>
            </div>
          </div>
        `;
      }

      card.innerHTML = innerHTML;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.qty-btn') || e.target.closest('.unit-select') || e.target.closest('.lote-input')) return;

        if (isSelected) {
          selectedAptProducts = selectedAptProducts.filter(p => p.product_id !== prod.id);
        } else {
          selectedAptProducts.push({ product_id: prod.id, cantidad: 1, unidad: 'Unidades', lote: '' });
        }
        renderAssignableProducts();
      });

      assignProductList.appendChild(card);
    });

    assignProductList.querySelectorAll('.qty-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const p = selectedAptProducts.find(x => x.product_id === id);
        if (btn.classList.contains('plus')) p.cantidad++;
        else if (p.cantidad > 1) p.cantidad--;
        renderAssignableProducts();
      };
    });

    assignProductList.querySelectorAll('.unit-select').forEach(sel => {
      sel.onchange = (e) => {
        const id = sel.dataset.id;
        const p = selectedAptProducts.find(x => x.product_id === id);
        p.unidad = e.target.value;
      };
    });

    assignProductList.querySelectorAll('.lote-input').forEach(input => {
      input.oninput = (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        const id = input.dataset.id;
        const p = selectedAptProducts.find(x => x.product_id === id);
        p.lote = e.target.value;
      };
    });
  }

  if (btnSaveAssignProduct) {
    btnSaveAssignProduct.addEventListener('click', async () => {
      if (!currentAptId) return;
      
      btnSaveAssignProduct.disabled = true;
      btnSaveAssignProduct.textContent = 'Guardando...';

      try {
        await supabase.from('appointment_products').delete().eq('appointment_id', currentAptId);

        if (selectedAptProducts.length > 0) {
          const toInsert = selectedAptProducts.map(p => ({
            appointment_id: currentAptId,
            product_id: p.product_id,
            cantidad: p.cantidad,
            unidad: p.unidad,
            lote: p.lote
          }));
          const { error } = await supabase.from('appointment_products').insert(toInsert);
          if (error) throw error;
        }

        assignProductModal.style.display = 'none';
        renderAppointmentProducts();
      } catch (err) {
        alert('Error al asignar: ' + err.message);
      } finally {
        btnSaveAssignProduct.textContent = 'Guardar Cambios';
      }
    });
  }

  // --- ITEM SELECTOR MODAL LOGIC ---
  const itemSelectorModal = document.getElementById('item-selector-modal');
  const btnCloseSelector = document.getElementById('btn-close-selector');
  const selectorTitle = document.getElementById('selector-title');
  const selectorSearch = document.getElementById('selector-search');
  const selectorList = document.getElementById('selector-list');

  let selectorType = ''; // 'client' or 'procedure'
  let selectorData = [];

  if (btnCloseSelector) {
    btnCloseSelector.onclick = () => itemSelectorModal.style.display = 'none';
  }

  if (itemSelectorModal) {
    itemSelectorModal.onclick = (e) => {
      if (e.target === itemSelectorModal) {
        itemSelectorModal.style.display = 'none';
      }
    };
  }

  function openSelector(type, title) {
    selectorType = type;
    selectorTitle.textContent = title;
    selectorSearch.value = '';
    itemSelectorModal.style.display = 'flex';
    loadSelectorData();
  }

  async function loadSelectorData() {
    selectorList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">Cargando...</p>';
    try {
      let data = [];
      if (selectorType === 'client') {
        const { data: clients } = await supabase.from('clients').select('*').order('nombre_completo');
        data = clients || [];
      } else {
        const { data: procs } = await supabase.from('procedimientos').select('*').order('nombre');
        data = procs || [];
      }
      selectorData = data;
      renderSelectorList(data);
    } catch (err) {
      console.error(err);
      selectorList.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 2rem;">Error al cargar datos</p>';
    }
  }

  function renderSelectorList(items) {
    selectorList.innerHTML = '';
    if (items.length === 0) {
      selectorList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">No hay resultados</p>';
      return;
    }

    items.forEach(item => {
      const name = selectorType === 'client' ? item.nombre_completo : item.nombre;
      const div = document.createElement('div');
      div.style.padding = '1rem';
      div.style.background = '#f8fafc';
      div.style.borderRadius = '12px';
      div.style.cursor = 'pointer';
      div.style.fontWeight = '600';
      div.style.color = '#1e293b';
      div.style.transition = 'all 0.2s';
      div.style.border = '1px solid #e2e8f0';
      div.textContent = name;
      
      div.onclick = async () => {
        try {
          const update = selectorType === 'client' ? { client_id: item.id } : { procedure_id: item.id };
          const { error } = await supabase.from('appointments').update(update).eq('id', currentAptId);
          if (error) throw error;
          
          itemSelectorModal.style.display = 'none';
          showAppointmentDetails(currentAptId); // Refresh details
        } catch (err) {
          alert('Error al actualizar: ' + err.message);
        }
      };
      
      div.onmouseenter = () => {
        div.style.background = '#e2e8f0';
        div.style.borderColor = '#cbd5e1';
      };
      div.onmouseleave = () => {
        div.style.background = '#f8fafc';
        div.style.borderColor = '#e2e8f0';
      };
      
      selectorList.appendChild(div);
    });
  }

  if (selectorSearch) {
    selectorSearch.oninput = (e) => {
      const query = e.target.value.toLowerCase().trim();
      const filtered = selectorData.filter(item => {
        const name = selectorType === 'client' ? item.nombre_completo : item.nombre;
        return name.toLowerCase().includes(query);
      });
      renderSelectorList(filtered);
    };
  }

  async function renderAppointmentProducts() {
    const container = document.getElementById('det-cita-productos-container');
    const emptyState = document.getElementById('det-cita-productos-empty');
    if (!container) return;

    try {
      const { data, error } = await supabase
        .from('appointment_products')
        .select('*, productos(nombre)')
        .eq('appointment_id', currentAptId);
      
      if (error) throw error;

      container.querySelectorAll('.apt-product-item').forEach(el => el.remove());

      if (data.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      data.forEach(ap => {
        const div = document.createElement('div');
        div.className = 'apt-product-item';
        div.style.background = '#f8fafc';
        div.style.borderRadius = '12px';
        div.style.padding = '0.75rem 1rem';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';
        div.style.marginBottom = '0.5rem';
        div.innerHTML = `
          <div>
            <p style="font-weight: 700; color: #1e293b; margin: 0;">${ap.productos.nombre}</p>
            <p style="font-size: 0.8rem; color: #64748b; margin: 0;">${ap.cantidad} ${ap.unidad}${ap.lote ? ` · Lote: ${ap.lote}` : ''}</p>
          </div>
          <button class="btn-remove-apt-product" data-id="${ap.id}" style="background: #fee2e2; border: none; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        `;
        container.appendChild(div);
      });

      // Add deletion logic for the remove buttons
      container.querySelectorAll('.btn-remove-apt-product').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          if (confirm('¿Estás seguro de que deseas quitar este producto de la cita?')) {
            try {
              const { error } = await supabase
                .from('appointment_products')
                .delete()
                .eq('id', id);
              
              if (error) throw error;
              
              // Refresh the products list
              await renderAppointmentProducts();
            } catch (err) {
              alert('Error al quitar el producto: ' + err.message);
            }
          }
        };
      });

    } catch (err) {
      console.error('Error rendering products:', err.message);
    }
  }


  // --- EDIT NOTES MODAL LOGIC ---
  const editNotesModal = document.getElementById('edit-notes-modal');
  const btnBackEditNotes = document.getElementById('btn-back-edit-notes');
  const btnSaveAptNotes = document.getElementById('btn-save-apt-notes');
  const notesTextarea = document.getElementById('edit-apt-notes-textarea');
  const btnVoiceNote = document.getElementById('btn-voice-note');

  if (btnBackEditNotes) {
    btnBackEditNotes.addEventListener('click', () => {
      editNotesModal.style.display = 'none';
    });
  }

  // Voice to Text logic
  let isListening = false;
  let baseText = '';

  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isListening = true;
      baseText = notesTextarea.value + (notesTextarea.value ? ' ' : '');
      btnVoiceNote.style.background = '#00bcd4';
      btnVoiceNote.querySelector('svg').style.stroke = 'white';
      btnVoiceNote.style.boxShadow = '0 0 15px rgba(0, 188, 212, 0.5)';
      console.log('Escuchando...');
    };

    recognition.onend = () => {
      isListening = false;
      btnVoiceNote.style.background = '#eef2f6';
      btnVoiceNote.querySelector('svg').style.stroke = '#64748b';
      btnVoiceNote.style.boxShadow = 'none';
      console.log('Fin de escucha');
    };

    recognition.onerror = (event) => {
      console.error('Error en reconocimiento:', event.error);
      recognition.stop();
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        notesTextarea.value = baseText + finalTranscript;
        baseText = notesTextarea.value + ' '; // Update base for next segments
      } else {
        notesTextarea.value = baseText + interimTranscript;
      }
      
      // Auto-scroll to bottom of textarea
      notesTextarea.scrollTop = notesTextarea.scrollHeight;
    };

    btnVoiceNote.addEventListener('click', () => {
      if (isListening) {
        recognition.stop();
      } else {
        try {
          recognition.start();
        } catch (e) {
          console.error('Error al iniciar reconocimiento:', e);
        }
      }
    });

    if (btnBackEditNotes) {
      btnBackEditNotes.addEventListener('click', () => {
        if (isListening) recognition.stop();
      });
    }
  } else {
    if (btnVoiceNote) btnVoiceNote.style.display = 'none';
  }

  if (btnSaveAptNotes) {
    btnSaveAptNotes.addEventListener('click', async () => {
      const notas = notesTextarea.value.trim();
      btnSaveAptNotes.disabled = true;
      btnSaveAptNotes.textContent = 'Guardando...';

      try {
        const { error } = await supabase
          .from('appointments')
          .update({ notas: notas })
          .eq('id', currentAptId);

        if (error) throw error;

        editNotesModal.style.display = 'none';
        showAppointmentDetails(currentAptId); // Reload to reflect changes
      } catch (err) {
        alert('Error al guardar notas: ' + err.message);
      } finally {
        btnSaveAptNotes.disabled = false;
        btnSaveAptNotes.textContent = 'Guardar Nota';
      }
    });
  }

  // Initial session check
  const initSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      hideAllViews();
      dashboardView.style.display = 'flex';
      switchToView('Citas');
      
      // Update filter label on startup
      if (globalCentroFilterId) {
        try {
          const { data: centro } = await supabase.from('centros').select('nombre').eq('id', globalCentroFilterId).single();
          if (centro) {
            const label = document.getElementById('global-filter-centro-text');
            if (label) label.textContent = centro.nombre;
          }
        } catch (e) { console.error("Error loading filter centro name:", e); }
      }

      loadAppointments(); // Cargar citas de Supabase al iniciar sesión
      dbLoadPhotos(); // Cargar fotos de Supabase al iniciar sesión
      loadClientes();
      loadDocumentos();
      loadReportes();
    }
  };
  // Logic for Gallery filtering
  const galeriaFiltroTipo = document.getElementById('galeria-filtro-tipo');
  const galeriaBuscadorLabel = document.getElementById('galeria-buscador-label');
  const galeriaSearchGroup = document.getElementById('galeria-search-group');
  const galeriaBtnLimpiar = document.getElementById('galeria-btn-limpiar-filtro');

  if (galeriaFiltroTipo && galeriaBuscadorLabel) {
    galeriaFiltroTipo.addEventListener('change', () => {
      const val = galeriaFiltroTipo.value;
      galeriaBuscadorLabel.textContent = `Buscar ${val}`;
    });
  }

  if (galeriaBtnLimpiar) {
    galeriaBtnLimpiar.addEventListener('click', () => {
      galeriaBuscadorLabel.textContent = `Buscar ${galeriaFiltroTipo.value}`;
      dbLoadPhotos();
    });
  }

  if (galeriaSearchGroup) {
    galeriaSearchGroup.addEventListener('click', async () => {
      const type = galeriaFiltroTipo.value;
      
      if (type === 'Cliente') {
        const { data: clients } = await supabase.from('clients').select('id, nombre_completo').order('nombre_completo');
        if (clients) {
          const names = clients.map(c => c.nombre_completo);
          const choice = prompt(`Selecciona un cliente:\n${names.join('\n')}`);
          const client = clients.find(c => c.nombre_completo === choice);
          if (client) {
            galeriaBuscadorLabel.textContent = client.nombre_completo;
            dbLoadPhotos('Cliente', client.id);
          }
        }
      } else if (type === 'Procedimiento') {
        const { data: procs } = await supabase.from('procedimientos').select('id, nombre').order('nombre');
        if (procs) {
          const names = procs.map(p => p.nombre);
          const choice = prompt(`Selecciona un procedimiento:\n${names.join('\n')}`);
          const proc = procs.find(p => p.nombre === choice);
          if (proc) {
            galeriaBuscadorLabel.textContent = proc.nombre;
            dbLoadPhotos('Procedimiento', proc.id);
          }
        }
      } else if (type === 'Centro') {
        const { data: centros } = await supabase.from('centros').select('id, nombre').order('nombre');
        if (centros) {
          const names = centros.map(c => c.nombre);
          const choice = prompt(`Selecciona un centro:\n${names.join('\n')}`);
          const centro = centros.find(c => c.nombre === choice);
          if (centro) {
            galeriaBuscadorLabel.textContent = centro.nombre;
            dbLoadPhotos('Centro', centro.id);
          }
        }
      } else if (type === 'Fecha') {
        const choice = prompt('Introduce la fecha (AAAA-MM-DD):', new Date().toISOString().split('T')[0]);
        if (choice) {
          galeriaBuscadorLabel.textContent = choice;
          dbLoadPhotos('Fecha', choice);
        }
      }
    });
  }

  // --- Global Center Filter Logic ---
  const btnOpenGlobalFilter = document.getElementById('btn-global-filter-centro');
  if (btnOpenGlobalFilter) {
    btnOpenGlobalFilter.addEventListener('click', () => {
      switchToView('FiltroCentro');
    });
  }

  const btnBackFromFilter = document.getElementById('back-from-filter-centro');
  if (btnBackFromFilter) {
    btnBackFromFilter.addEventListener('click', () => {
      switchToView('Menú');
    });
  }

  async function renderGlobalCentroFilter() {
    const listContainer = document.getElementById('global-centro-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 2rem;">Cargando centros...</p>';

    try {
      // Get all centers
      const { data: centers, error } = await supabase.from('centros').select('*').order('nombre');
      if (error) throw error;

      let html = `
        <div class="global-centro-item ${!globalCentroFilterId ? 'active' : ''}" data-id="all" style="background: white; padding: 1rem; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; border: 2px solid ${!globalCentroFilterId ? '#00bcd4' : 'transparent'}; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 0.75rem;">
          <span style="font-weight: 700; color: #1e293b;">Todos los centros</span>
          ${!globalCentroFilterId ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </div>
      `;

      centers.forEach(centro => {
        const isActive = globalCentroFilterId === centro.id;
        html += `
          <div class="global-centro-item ${isActive ? 'active' : ''}" data-id="${centro.id}" style="background: white; padding: 1rem; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; border: 2px solid ${isActive ? '#00bcd4' : 'transparent'}; box-shadow: 0 2px 8px rgba(0,0,0,0.05); margin-bottom: 0.75rem;">
            <span style="font-weight: 700; color: #1e293b;">${centro.nombre}</span>
            ${isActive ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
          </div>
        `;
      });

      listContainer.innerHTML = html;

      // Add click listeners
      listContainer.querySelectorAll('.global-centro-item').forEach(item => {
        item.onclick = () => {
          const id = item.dataset.id;
          if (id === 'all') {
            globalCentroFilterId = null;
            localStorage.removeItem('globalCentroFilterId');
            document.getElementById('global-filter-centro-text').textContent = 'Todos los centros';
          } else {
            globalCentroFilterId = id;
            localStorage.setItem('globalCentroFilterId', id);
            document.getElementById('global-filter-centro-text').textContent = item.querySelector('span').textContent;
          }
          
          // Re-load data with new filter
          loadAppointments();
          dbLoadPhotos();
          loadClientes();
          loadDocumentos();
          loadReportes();
          
          // Go back
          switchToView('Menú');
        };
      });

    } catch (err) {
      console.error('Error rendering global center filter:', err.message);
    }
  }

  initSession();
});

