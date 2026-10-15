// js/script.js - Motor conectado a la IA (Backend)

function initNutriApp() {
  return {
    user: null,
    cargandoAuth: true,
    cargandoIA: false, // Variable para mostrar que Gemini está pensando
    modoRegistro: false,
    emailAuth: '',
    passAuth: '',

    pestanaActiva: 'plan',
    darkMode: true,
    mostrarAvanzado: false,
    userStoreId: localStorage.getItem('nutri_user_id') || 'nutri_default',

    perfil: {
      nombre: 'Marco Antonio',
      edad: 29,
      sexo: 'M',
      peso: 69.85,
      estatura: 173,
      actividad: '1.55',
      objetivo: 'bajar',
      padecimiento: 'ninguno',
      grasaCorporal: '',
      metabolismoBasal: '',
      masaMuscular: ''
    },

    planCalculado: null,
    historialProgreso: [],
    nuevoPesoProgreso: '',
    nuevaGrasaProgreso: '',

    initDatabase() {
      const localPlan = localStorage.getItem('nutri_plan_cache');
      if (localPlan) this.planCalculado = JSON.parse(localPlan);

      const localHistorial = localStorage.getItem('nutri_progreso_cache');
      if (localHistorial) this.historialProgreso = JSON.parse(localHistorial);

      setTimeout(() => { this.cargandoAuth = false; }, 1000);

      try {
        if (typeof firebase !== 'undefined' && !firebase.apps.length) {
          firebase.initializeApp({
            apiKey: "AIzaSyCmT6nhn604z13KYwBtgORwKbil_aUx20s",
            authDomain: "mi-pos-restaurant-appsweb.firebaseapp.com",
            projectId: "mi-pos-restaurant-appsweb",
            storageBucket: "mi-pos-restaurant-appsweb.firebasestorage.app",
            messagingSenderId: "329389609164",
            appId: "1:329389609164:web:24839bef9222d58c79b269"
          });
        }
        if (typeof firebase !== 'undefined' && firebase.auth) {
          firebase.auth().onAuthStateChanged((user) => {
            if (user) {
              this.user = user;
              this.userStoreId = user.uid;
              localStorage.setItem('nutri_user_id', user.uid);
              this.cargarDatosUsuario();
            } else {
              this.user = null;
            }
            this.cargandoAuth = false;
          });
        }
      } catch (e) {
        console.error("Aviso Firebase:", e);
        this.cargandoAuth = false;
      }

      if (localStorage.getItem('nutri_darkMode') !== null) {
        this.darkMode = localStorage.getItem('nutri_darkMode') === 'true';
      }
    },

    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      localStorage.setItem('nutri_darkMode', this.darkMode);
    },

    procesarAuth() {
      this.cargandoAuth = true;
      if (this.modoRegistro) {
        firebase.auth().createUserWithEmailAndPassword(this.emailAuth, this.passAuth)
          .then((cred) => {
            this.user = cred.user;
            this.userStoreId = cred.user.uid;
            localStorage.setItem('nutri_user_id', cred.user.uid);
            this.cargarDatosUsuario();
          })
          .catch(err => { alert("Error al registrar: " + err.message); this.modoRegistro = false; })
          .finally(() => this.cargandoAuth = false);
      } else {
        firebase.auth().signInWithEmailAndPassword(this.emailAuth, this.passAuth)
          .then((cred) => {
            this.user = cred.user;
            this.userStoreId = cred.user.uid;
            localStorage.setItem('nutri_user_id', cred.user.uid);
            this.cargarDatosUsuario();
          })
          .catch(err => alert("Error al iniciar sesión: " + err.message))
          .finally(() => this.cargandoAuth = false);
      }
    },

    cerrarSesion() {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(() => { this.user = null; });
      } else {
        this.user = null;
      }
    },

    cargarDatosUsuario() {
      if (typeof firebase === 'undefined' || !firebase.firestore) return;
      const db = firebase.firestore();
      db.collection('nutricion_usuarios').doc(this.userStoreId).collection('progreso')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
          if (!snapshot.empty) {
            this.historialProgreso = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            localStorage.setItem('nutri_progreso_cache', JSON.stringify(this.historialProgreso));
          }
        });
    },

    // AQUI ES DONDE NOS CONECTAMOS A LA IA
    async calcularPlan() {
      this.cargandoIA = true; // Activa el botón de carga
      
      try {
        // Llama al archivo backend api/calcular.js
        const response = await fetch('/api/calcular', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.perfil)
        });

        if (!response.ok) {
          throw new Error('Error en el servidor al calcular el plan con Gemini');
        }

        // Recibe el JSON directamente de Gemini
        const data = await response.json();
        
        this.planCalculado = data;
        localStorage.setItem('nutri_plan_cache', JSON.stringify(this.planCalculado));
        
      } catch (error) {
        alert("Ocurrió un error al contactar con Gemini: " + error.message);
        console.error(error);
      } finally {
        this.cargandoIA = false; // Desactiva el botón de carga
      }
    },

    guardarProgreso() {
      if (!this.nuevoPesoProgreso) return alert("Ingresa un peso válido.");
      const nuevoReg = {
        peso: Number(this.nuevoPesoProgreso),
        grasa: this.nuevaGrasaProgreso ? Number(this.nuevaGrasaProgreso) : null,
        fechaTexto: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now()
      };
      this.historialProgreso.unshift(nuevoReg);
      localStorage.setItem('nutri_progreso_cache', JSON.stringify(this.historialProgreso));
      
      if (typeof firebase !== 'undefined' && firebase.firestore && this.user) {
        firebase.firestore().collection('nutricion_usuarios').doc(this.userStoreId).collection('progreso').add(nuevoReg);
      }
      this.nuevoPesoProgreso = ''; this.nuevaGrasaProgreso = '';
      alert("¡Pesaje guardado correctamente!");
    },
    
    imprimirPlan() { window.print(); }
  };
}
