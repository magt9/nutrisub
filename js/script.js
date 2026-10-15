// js/script.js - NutriFit Planner con Firebase Auth y Firestore Progress Tracker

function initNutriApp() {
  return {
    user: null,
    cargandoAuth: true,
    modoRegistro: false,
    emailAuth: '',
    passAuth: '',

    pestanaActiva: 'plan', // 'plan' o 'progreso'
    darkMode: true,
    userStoreId: localStorage.getItem('nutri_user_id') || 'nutri_default',

    // Formulario de perfil del usuario
    perfil: {
      edad: 25,
      sexo: 'M',
      peso: 70,
      estatura: 173,
      actividad: '1.55',
      objetivo: 'bajar'
    },

    planCalculado: null,

    // Historial de pesajes
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
          .catch(err => {
            if (err.code === 'auth/email-already-in-use') {
              alert("Este correo ya está registrado. Cambiando a Iniciar Sesión...");
              this.modoRegistro = false;
            } else {
              alert("Error al registrar: " + err.message);
            }
          })
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

      // Cargar historial de progreso
      db.collection('nutricion_usuarios').doc(this.userStoreId).collection('progreso')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
          if (!snapshot.empty) {
            this.historialProgreso = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            localStorage.setItem('nutri_progreso_cache', JSON.stringify(this.historialProgreso));
          }
        });
    },

    // --- LÓGICA DE CÁLCULO NUTRICIONAL ---
    calcularPlan() {
      const edad = Number(this.perfil.edad);
      const peso = Number(this.perfil.peso);
      const estatura = Number(this.perfil.estatura);
      const sexo = this.perfil.sexo;
      const actividad = Number(this.perfil.actividad);
      const objetivo = this.perfil.objetivo;

      // Fórmula Mifflin-St Jeor
      let tmb = (10 * peso) + (6.25 * estatura) - (5 * edad);
      tmb += (sexo === 'M') ? +5 : -161;

      let caloriasMantenimiento = tmb * actividad;
      let caloriasObjetivo = caloriasMantenimiento;
      let grProteinaXKg = 1.8;

      switch (objetivo) {
        case 'bajar':
          caloriasObjetivo -= 500;
          grProteinaXKg = 2.0;
          break;
        case 'definir':
          caloriasObjetivo -= 700;
          grProteinaXKg = 2.2;
          break;
        case 'tonificar':
          caloriasObjetivo -= 200;
          grProteinaXKg = 2.0;
          break;
        case 'masa':
          caloriasObjetivo += 400;
          grProteinaXKg = 1.8;
          break;
      }

      if (sexo === 'F' && caloriasObjetivo < 1200) caloriasObjetivo = 1200;
      if (sexo === 'M' && caloriasObjetivo < 1500) caloriasObjetivo = 1500;

      const grProteina = peso * grProteinaXKg;
      const grGrasa = peso * 0.9;
      const calCarbos = caloriasObjetivo - (grProteina * 4) - (grGrasa * 9);
      const grCarbos = calCarbos / 4;

      // Distribución por comidas en gramos reales
      const protDesayuno = Math.round((grProteina * 0.3) / 20) * 50;
      const protComida = Math.round((grProteina * 0.45) / 20) * 50;
      const protCena = Math.round((grProteina * 0.25) / 20) * 50;

      const carbDesayuno = Math.round((grCarbos * 0.3) / 25);
      const carbComida = Math.round((grCarbos * 0.5) / 25);
      const carbCena = Math.max(1, Math.round((grCarbos * 0.2) / 25));

      this.planCalculado = {
        calorias: Math.round(caloriasObjetivo),
        proteinas: Math.round(grProteina),
        carbos: Math.round(grCarbos),
        grasas: Math.round(grGrasa),
        distribucion: {
          desayunoProt: protDesayuno,
          comidaProt: protComida,
          cenaProt: protCena,
          desayunoCarb: carbDesayuno,
          comidaCarb: carbComida,
          cenaCarb: carbCena
        }
      };

      localStorage.setItem('nutri_plan_cache', JSON.stringify(this.planCalculado));
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

      this.nuevoPesoProgreso = '';
      this.nuevaGrasaProgreso = '';
      alert("¡Registro de peso guardado!");
    },

    imprimirPlan() {
      window.print();
    }
  };
}
