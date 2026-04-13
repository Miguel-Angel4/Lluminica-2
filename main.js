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
  const createAppointmentView = document.querySelector('#create-appointment-view');

  // View toggling logic extended
  const hideAllViews = () => {
    loginView.style.display = 'none';
    registerView.style.display = 'none';
    forgotView.style.display = 'none';
    updatePasswordView.style.display = 'none';
    dashboardView.style.display = 'none';
    if(createAppointmentView) createAppointmentView.style.display = 'none';
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
      // If it's the calendar tab, we don't switch yet because it's 'Próximamente'
      if (tab.id === 'tab-calendario') {
        alert('La vista de Calendario estará disponible próximamente.');
        return;
      }
      
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  const menuItems = document.querySelectorAll('.menu-item');

  const hideAllDashboardViews = () => {
    const views = ['#view-citas', '#view-galeria', '#view-clientes', '#view-menu', '#view-documentos', '#view-subir-documento', '#view-productos', '#view-crear-producto', '#view-procedimientos', '#view-crear-procedimiento', '#view-centros', '#view-crear-centro'];
    views.forEach(selector => {
      const v = document.querySelector(selector);
      if (v) v.style.display = 'none';
    });
  };

  const switchToView = (label) => {
    navItems.forEach(ni => ni.classList.remove('active'));
    
    // Find matching nav item and activate it
    navItems.forEach(ni => {
      const navLabel = ni.querySelector('span').innerText;
      if (navLabel === label) ni.classList.add('active');
    });

    hideAllDashboardViews();

    if (label === 'Citas') {
      const view = document.querySelector('#view-citas');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Citas';
    } else if (label === 'Galería') {
      const view = document.querySelector('#view-galeria');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Galería';
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
    } else if (label === 'Productos') {
      const view = document.querySelector('#view-productos');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Productos';
      loadProductos();
    } else if (label === 'Crear Producto') {
      const view = document.querySelector('#view-crear-producto');
      if(view) view.style.display = 'flex';
      document.title = 'Lluminica - Crear Producto';
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
    } else {
      alert(`La sección de ${label} estará disponible próximamente.`);
    }
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const label = item.querySelector('span').innerText;
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

        const { error } = await supabase
          .from('documentos')
          .insert({
            nombre: file.name,
            user_id: user.id
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
        alert('Error al subir: ' + err.message);
      } finally {
        btnDoUploadDoc.disabled = false;
        btnDoUploadDoc.textContent = 'Subir';
      }
    });
  }

  async function loadDocumentos() {
    if (!docsListContainer) return;
    
    try {
      const { data: docs, error } = await supabase
        .from('documentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      renderDocumentos(docs);
    } catch (err) {
      console.error('Error loading documentos:', err.message);
    }
  }

  function renderDocumentos(docs) {
    if (!docsListContainer) return;
    
    if (!docs || docs.length === 0) {
      docsListContainer.innerHTML = `
        <p style="color: #94a3b8; font-size: 1.1rem; text-align: center; margin-top: 2rem;">No hay documentos</p>
      `;
      return;
    }

    docsListContainer.innerHTML = docs.map(doc => `
      <div class="doc-card">
        <div class="doc-info">
          <div class="doc-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="doc-name">${doc.nombre}</div>
        </div>
        <button class="btn-asignar">Asignar</button>
      </div>
    `).join('');
  }

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

      if (['Citas', 'Galería', 'Clientes', 'Menú', 'Documentos', 'Productos', 'Procedimientos'].includes(label)) {
        switchToView(label);
      } else {
        alert(`La sección de ${label} estará disponible próximamente.`);
      }
    });
  }

  // Also handle the profile card which is outside management list
  const userProfileCard = document.querySelector('.menu-card:not(.feature-card)');
  if (userProfileCard) {
    userProfileCard.addEventListener('click', () => {
       // Profile card could also open a profile view, for now it stays in menu
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

  // Image Context (gallery or product)
  let currentImageContext = 'gallery';
  let currentProductImageData = null;
  let allProductData = [];
  let allProcData = [];

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
      } else {
        updateProcIconPreview(svgHtml);
        currentProcIconData = svgHtml; // Store it
      }
    });
  });

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

    const internalSessionPhotos = [];
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
      });
      // Simulate selecting a new client by hiding it if you click "Crear nuevo cliente"
      const createClientBtn = wizardClientDropdown.querySelector('button');
      if (createClientBtn) {
        createClientBtn.addEventListener('click', () => {
          wizardClientDropdown.style.display = 'none';
          wizardClientSelect.querySelector('span').textContent = 'Cliente Nuevo';
          wizardClientSelect.querySelector('span').style.color = '#334155';
          wizardSaveBtn.style.background = '#06b6d4';
          wizardSaveBtn.style.color = 'white';
          wizardSaveBtn.style.cursor = 'pointer';
        });
      }
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

        // Add selected photos to the main wall
        selectedInternalPhotos.forEach(idx => {
          const dataUrl = internalSessionPhotos[idx];
          const imgContainer = document.createElement('div');
          imgContainer.style.aspectRatio = '1 / 1';
          imgContainer.style.width = '100%';
          imgContainer.style.borderRadius = '8px';
          imgContainer.style.overflow = 'hidden';
          imgContainer.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          img.style.display = 'block';
          
          imgContainer.appendChild(img);
          galeriaContent.appendChild(imgContainer);
        });

        // Close all
        addImagesModal.style.display = 'none';
        internalGalleryModal.style.display = 'none';
        selectedInternalPhotos.clear();
        updateActionBar();
        
        // Reset wizard state
        wizardClientSelect.querySelector('span').textContent = 'Selecciona un Cliente';
        wizardClientSelect.querySelector('span').style.color = '#64748b';
        wizardSaveBtn.style.background = '#cbd5e1';
        wizardSaveBtn.style.color = '#475569';
        wizardSaveBtn.style.cursor = 'not-allowed';
      });
    }

    if (addToMainGalleryBtn) {
      addToMainGalleryBtn.addEventListener('click', () => {
        internalGalleryModal.style.display = 'none';
        addImagesModal.style.display = 'flex';
        wizardImagesContainer.innerHTML = '';

        selectedInternalPhotos.forEach(idx => {
          const dataUrl = internalSessionPhotos[idx];
          
          const div = document.createElement('div');
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

    const renderInternalGallery = () => {
      if (!internalGalleryGrid) return;
      internalGalleryGrid.innerHTML = '';
      if (internalSessionPhotos.length === 0) {
        internalGalleryGrid.innerHTML = '<p style="grid-column: span 3; text-align: center; margin-top: 2rem; color: #64748b;">No hay fotos guardadas en esta sesión.</p>';
        return;
      }
      internalSessionPhotos.forEach((dataUrl, idx) => {
        const renderDiv = document.createElement('div');
        renderDiv.style.aspectRatio = '1 / 1';
        renderDiv.style.width = '100%';
        renderDiv.style.borderRadius = '4px';
        renderDiv.style.overflow = 'hidden';
        renderDiv.style.cursor = 'pointer';
        renderDiv.style.position = 'relative';
        
        const renderImg = document.createElement('img');
        renderImg.src = dataUrl;
        renderImg.style.width = '100%';
        renderImg.style.height = '100%';
        renderImg.style.objectFit = 'cover';
        renderImg.style.display = 'block';

        const circle = document.createElement('div');
        circle.style.position = 'absolute';
        circle.style.top = '6px';
        circle.style.left = '6px';
        circle.style.width = '24px';
        circle.style.height = '24px';
        circle.style.borderRadius = '50%';
        circle.style.border = '2px solid white';
        circle.style.display = 'flex';
        circle.style.alignItems = 'center';
        circle.style.justifyContent = 'center';
        
        // Update selection UI based on current state
        const updateSelectionUI = () => {
          if (selectedInternalPhotos.has(idx)) {
            circle.style.background = '#00897b'; // Green matching the button
            circle.style.borderColor = '#00897b';
            circle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            renderDiv.style.transform = 'scale(0.95)';
            renderDiv.style.transition = 'transform 0.1s';
          } else {
            circle.style.background = 'rgba(0,0,0,0.3)';
            circle.style.borderColor = 'white';
            circle.innerHTML = '';
            renderDiv.style.transform = 'scale(1)';
            renderDiv.style.transition = 'transform 0.1s';
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
        } else {
          // Save to internal gallery explicitly (don't download)
          internalSessionPhotos.unshift(dataUrl);
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
        } else {
          internalSessionPhotos.unshift(dataUrl);
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
      
      if (currentImageContext === 'product') {
        // En productos, "GALERÍA" abre el explorador de archivos del PC/Móvil
        if (galleryInput) galleryInput.click();
      } else {
        // En la Galería general, abre la UI custom con las fotos ya capturadas
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
            genero: gender
          }
        ]);

        if (error) throw error;

        // Reset and close
        document.getElementById('client-name').value = '';
        document.getElementById('client-nif').value = '';
        document.getElementById('client-birthday').value = '';
        document.getElementById('client-email').value = '';
        document.getElementById('client-phone').value = '';
        
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!clients || clients.length === 0) {
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
        renderClientesList(clients);
      }
    } catch (err) {
        console.error('Error loading clients:', err.message);
    }
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

  function openClientProfile(client) {
    const profileView = document.getElementById('client-profile-view');
    if (!profileView) return;

    document.getElementById('profile-name').textContent = client.nombre_completo;
    document.getElementById('profile-bday').textContent = client.fecha_nacimiento ? formatDate(client.fecha_nacimiento) : 'Sin fecha';
    document.getElementById('profile-gender').textContent = client.genero || 'No especificado';
    
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
            genero: gender
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

  if (btnSuccessOk && modalSuccess) {
    btnSuccessOk.addEventListener('click', () => {
      modalSuccess.style.display = 'none';
      switchToView('Procedimientos');
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

        // Show Success Modal instead of immediate redirect
        if (modalSuccess) {
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
        btnEmpty.addEventListener('click', () => switchToView('Crear Procedimiento'));
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
      document.querySelector('#view-crear-centro h2').textContent = 'Crear Centro';
      document.getElementById('btn-save-centro').textContent = 'Crear un nuevo centro';
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
          modalSuccess.querySelector('p').textContent = editingCentroId ? 'Centro actualizado con éxito' : 'Centro creado con éxito';
          // Fix for the OK button to handle dynamic context
          const originalOkHandler = btnSuccessOk.onclick;
          btnSuccessOk.onclick = () => {
            modalSuccess.style.display = 'none';
            switchToView('Centros');
            // Restore handler for next time
            btnSuccessOk.onclick = null; 
            // We should ideally have a more robust logic for this
          };
          modalSuccess.style.display = 'flex';
        } else {
          switchToView('Centros');
        }
        editingCentroId = null;
      } catch (err) {
        alert('Error: ' + err.message);
      } finally {
        btnSaveCentro.disabled = false;
        btnSaveCentro.textContent = editingCentroId ? 'Guardar Cambios' : 'Crear un nuevo centro';
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
        <button id="btn-empty-create-centro" style="padding: 0.85rem 1.75rem; border-radius: 10px; background: #00bcd4; border: none; color: white; font-size: 1rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);">Crear un nuevo centro</button>
      `;
      list.style.justifyContent = 'center';
      
      const btnEmpty = document.getElementById('btn-empty-create-centro');
      if (btnEmpty) {
        btnEmpty.addEventListener('click', () => {
          editingCentroId = null;
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

  const procSearchInput = document.getElementById('proc-search-input');
  if (procSearchInput) {
    procSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const filtered = allProcData.filter(p => p.nombre.toLowerCase().includes(query));
      renderProcedimientosList(filtered);
    });
  }
});
