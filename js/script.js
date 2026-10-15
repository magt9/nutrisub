// js/script.js - Motor Dinámico con Cálculo Proporcional y Firebase

function initNutriApp() {
  return {
    user: null,
    cargandoAuth: true,
    modoRegistro: false,
    emailAuth: '',
    passAuth: '',

    pestanaActiva: 'plan',
    darkMode: true,
    userStoreId: localStorage.getItem('nutri_user_id') || 'nutri_default',

    perfil: {
      nombre: 'Marco',
      edad: 25,
      sexo: 'M',
      peso: 70,
      estatura: 173,
      actividad: '1.55',
      objetivo: 'bajar'
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
          .catch(err => {
            if (err.code === 'auth/email-already-in-use') {
              alert("Este correo ya está registrado. Inicia sesión.");
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

      db.collection('nutricion_usuarios').doc(this.userStoreId).collection('progreso')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
          if (!snapshot.empty) {
            this.historialProgreso = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            localStorage.setItem('nutri_progreso_cache', JSON.stringify(this.historialProgreso));
          }
        });
    },

    // MOTOR DE CÁLCULO PROPORCIONAL DINÁMICO
    calcularPlan() {
      const edad = Number(this.perfil.edad);
      const peso = Number(this.perfil.peso);
      const estatura = Number(this.perfil.estatura);
      const sexo = this.perfil.sexo;
      const actividad = Number(this.perfil.actividad);
      const objetivo = this.perfil.objetivo;

      // 1. Tasa Metabólica Basal (Mifflin-St Jeor)
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

      // 2. Macronutrientes totales
      const grProteinaTotal = peso * grProteinaXKg;
      const grGrasaTotal = peso * 0.9;
      const calCarbos = caloriasObjetivo - (grProteinaTotal * 4) - (grGrasaTotal * 9);
      const grCarbosTotal = Math.max(50, calCarbos / 4);

      // 3. Distribución PROPORCIONAL en Alimento Real por Comidas
      // Convertir gramos de proteína a gramos de carne/alimento cocido (100g carne = 22g proteína)
      const grCarneTotalCocida = (grProteinaTotal / 22) * 100;
      // Convertir gramos de CH a porciones de cereales (1 porción = 22g CH)
      const porcionesCarbosTotales = Math.round(grCarbosTotal / 22);

      // Repartir en Desayuno (30%), Comida (45%), Cena (25%)
      const dist = {
        desayunoProt: Math.round((grCarneTotalCocida * 0.3) / 10) * 10,
        comidaProt: Math.round((grCarneTotalCocida * 0.45) / 10) * 10,
        cenaProt: Math.round((grCarneTotalCocida * 0.25) / 10) * 10,

        desayunoLacteo: 100,
        comidaLacteo: 50,
        cenaLacteo: 100,

        desayunoVerd: 40,
        comidaVerd: 80,
        cenaVerd: 40,

        desayunoCarb: Math.max(1, Math.round(porcionesCarbosTotales * 0.3)),
        comidaCarb: Math.max(1, Math.round(porcionesCarbosTotales * 0.5)),
        cenaCarb: Math.max(1, Math.round(porcionesCarbosTotales * 0.2)),

        desayunoFruta: 1,
        comidaFruta: 1,
        cenaFruta: 1,

        desayunoGrasa: 1,
        comidaGrasa: 1,
        cenaGrasa: 1
      };

      this.planCalculado = {
        nombre: this.perfil.nombre || 'Usuario',
        calorias: Math.round(caloriasObjetivo),
        proteinas: Math.round(grProteinaTotal),
        carbos: Math.round(grCarbosTotal),
        grasas: Math.round(grGrasaTotal),
        dist: dist
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
