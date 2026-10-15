// js/script.js - Motor con Módulo Clínico Avanzado de Bioimpedancia

function initNutriApp() {
  return {
    user: null,
    cargandoAuth: true,
    modoRegistro: false,
    emailAuth: '',
    passAuth: '',

    pestanaActiva: 'plan',
    darkMode: true,
    mostrarAvanzado: false, // Controla el despliegue de datos de Bioimpedancia
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
      // Datos clínicos avanzados
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

    calcularPlan() {
      const edad = Number(this.perfil.edad);
      const peso = Number(this.perfil.peso);
      const estatura = Number(this.perfil.estatura);
      const sexo = this.perfil.sexo;
      const actividad = Number(this.perfil.actividad);
      const objetivo = this.perfil.objetivo;
      const padecimiento = this.perfil.padecimiento;
      
      const grasa = Number(this.perfil.grasaCorporal);
      const basalMedido = Number(this.perfil.metabolismoBasal);

      // 1. Tasa Metabólica Basal (Selección del Método Clínico)
      let tmb = 0;
      let metodoBasal = "";

      if (basalMedido > 0) {
        // PREFERENCIA 1: Uso directo de medición del escáner (Ej: 1604 kcal)
        tmb = basalMedido;
        metodoBasal = "Bioimpedancia Directa";
      } else if (grasa > 0 && grasa < 100) {
        // PREFERENCIA 2: Katch-McArdle usando Masa Libre de Grasa
        let masaMagra = peso * (1 - (grasa / 100));
        tmb = 370 + (21.6 * masaMagra);
        metodoBasal = "Fórmula Katch-McArdle (Masa Magra)";
      } else {
        // PREFERENCIA 3: Predicción Poblacional Mifflin-St Jeor
        tmb = (10 * peso) + (6.25 * estatura) - (5 * edad);
        tmb += (sexo === 'M') ? +5 : -161;
        metodoBasal = "Mifflin-St Jeor (Poblacional)";
      }

      let caloriasMantenimiento = tmb * actividad;
      let caloriasObjetivo = caloriasMantenimiento;
      let grProteinaXKg = 1.8;

      switch (objetivo) {
        case 'bajar': caloriasObjetivo -= 500; grProteinaXKg = 2.0; break;
        case 'definir': caloriasObjetivo -= 700; grProteinaXKg = 2.2; break;
        case 'tonificar': caloriasObjetivo -= 200; grProteinaXKg = 2.0; break;
        case 'masa': caloriasObjetivo += 400; grProteinaXKg = 1.8; break;
      }

      let indicacionClinica = "Dieta estándar balanceada.";
      let nombrePadecimiento = "Sin Padecimiento (Persona Sana)";
      let porcentajeGrasaPermitido = 0.9;

      if (padecimiento === 'diabetes') {
        nombrePadecimiento = "Diabetes Mellitus";
        indicacionClinica = "Control estricto glucémico. Fibras altas y C.H. complejos obligatorios.";
      } else if (padecimiento === 'hepatitis') {
        nombrePadecimiento = "Enfermedad Hepática";
        indicacionClinica = "Reducción crítica de lípidos (0.4g/kg). Proteínas exclusivamente magras.";
        porcentajeGrasaPermitido = 0.4;
      } else if (padecimiento === 'renal') {
        nombrePadecimiento = "Enfermedad Renal Crónica";
        indicacionClinica = "Restricción proteica a 0.8g/kg para evitar hiperfiltración nefronal.";
        grProteinaXKg = 0.8;
      } else if (padecimiento === 'hipertension') {
        nombrePadecimiento = "Hipertensión Arterial";
        indicacionClinica = "Protocolo DASH. Eliminación total de sodio añadido y embutidos.";
      }

      if (sexo === 'F' && caloriasObjetivo < 1200) caloriasObjetivo = 1200;
      if (sexo === 'M' && caloriasObjetivo < 1500) caloriasObjetivo = 1500;

      const grProteinaPuraTotal = peso * grProteinaXKg;
      const grGrasaTotal = peso * porcentajeGrasaPermitido;
      const calCarbos = caloriasObjetivo - (grProteinaPuraTotal * 4) - (grGrasaTotal * 9);
      const grCarbosTotal = Math.max(50, calCarbos / 4);

      const protPuraDesayuno = Math.round(grProteinaPuraTotal * 0.30);
      const protPuraComida = Math.round(grProteinaPuraTotal * 0.45);
      const protPuraCena = Math.round(grProteinaPuraTotal * 0.25);

      const calcularEquivalentes = (protPura) => ({
        pollo: Math.round(protPura / 0.31),
        res: Math.round(protPura / 0.26),
        atun: Math.round(protPura / 0.24),
        pescado: Math.round(protPura / 0.22),
        tofu: Math.round(protPura / 0.15),
        claras: Math.round(protPura / 3.6)
      });

      const porcionesCarbosTotales = Math.round(grCarbosTotal / 22);

      let textoLacteo = "100 g";
      if (padecimiento === 'hepatitis') textoLacteo = "0 g (Prohibido)";
      if (padecimiento === 'renal') textoLacteo = "50 g (Fósforo restringido)";

      this.planCalculado = {
        nombre: this.perfil.nombre || 'Usuario',
        nombrePadecimiento: nombrePadecimiento,
        indicacionClinica: indicacionClinica,
        metodoBasal: metodoBasal,
        calorias: Math.round(caloriasObjetivo),
        proteinas: Math.round(grProteinaPuraTotal),
        carbos: Math.round(grCarbosTotal),
        grasas: Math.round(grGrasaTotal),
        metasPuras: { desayunoProtPura: protPuraDesayuno, comidaProtPura: protPuraComida, cenaProtPura: protPuraCena },
        equivalencias: { desayuno: calcularEquivalentes(protPuraDesayuno), comida: calcularEquivalentes(protPuraComida), cena: calcularEquivalentes(protPuraCena) },
        dist: {
          desayunoLacteo: textoLacteo,
          comidaLacteo: padecimiento === 'hepatitis' ? "0 g" : "50 g",
          cenaLacteo: textoLacteo,
          desayunoVerd: 40, comidaVerd: 80, cenaVerd: 40,
          desayunoCarb: Math.max(1, Math.round(porcionesCarbosTotales * 0.3)),
          comidaCarb: Math.max(1, Math.round(porcionesCarbosTotales * 0.5)),
          cenaCarb: Math.max(1, Math.round(porcionesCarbosTotales * 0.2))
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
      this.nuevoPesoProgreso = ''; this.nuevaGrasaProgreso = '';
      alert("¡Pesaje guardado correctamente!");
    },
    imprimirPlan() { window.print(); }
  };
}
