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

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const label = item.querySelector('span').innerText;
      const viewCitas = document.querySelector('#view-citas');
      const viewGaleria = document.querySelector('#view-galeria');
      const viewClientes = document.querySelector('#view-clientes');
      const viewMenu = document.querySelector('#view-menu');
      
      navItems.forEach(ni => ni.classList.remove('active'));
      item.classList.add('active');

      if (label === 'Citas') {
        if(viewCitas) viewCitas.style.display = 'flex';
        if(viewGaleria) viewGaleria.style.display = 'none';
        if(viewClientes) viewClientes.style.display = 'none';
        document.title = 'Lluminica - Citas';
      } else if (label === 'Galería') {
        if(viewCitas) viewCitas.style.display = 'none';
        if(viewGaleria) viewGaleria.style.display = 'flex';
        if(viewClientes) viewClientes.style.display = 'none';
        document.title = 'Lluminica - Galería';
      } else if (label === 'Clientes') {
        if(viewCitas) viewCitas.style.display = 'none';
        if(viewGaleria) viewGaleria.style.display = 'none';
        if(viewClientes) viewClientes.style.display = 'block';
        if(viewMenu) viewMenu.style.display = 'none';
        document.title = 'Lluminica - Clientes';
        loadClientes();
      } else if (label === 'Menú') {
        if(viewCitas) viewCitas.style.display = 'none';
        if(viewGaleria) viewGaleria.style.display = 'none';
        if(viewClientes) viewClientes.style.display = 'none';
        if(viewMenu) viewMenu.style.display = 'block';
        document.title = 'Lluminica - Menú';
      } else {
        alert(`La sección de ${label} estará disponible próximamente.`);
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
        // Save to internal gallery explicitly (don't download)
        internalSessionPhotos.unshift(dataUrl);
        alert('Foto guardada en Galería.');
        stopWebcam();
      });
    }

    // Capture mobile photo and save inside internal gallery
    cameraInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
          internalSessionPhotos.unshift(ev.target.result);
          alert('Foto guardada en Galería.');
        };
        reader.readAsDataURL(file);
      }
    });

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
      // Abre la UI custom y pinta el array de sesión
      if (internalGalleryModal) {
        internalGalleryModal.style.display = 'flex';
        renderInternalGallery();
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
});
