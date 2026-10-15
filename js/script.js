// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCmT6nhn604z13KYwBtgORwKbil_aUx20s",
  authDomain: "mi-pos-restaurant-appsweb.firebaseapp.com",
  projectId: "mi-pos-restaurant-appsweb",
  storageBucket: "mi-pos-restaurant-appsweb.firebasestorage.app",
  messagingSenderId: "329389609164",
  appId: "1:329389609164:web:24839bef9222d58c79b269",
  measurementId: "G-CXRB8NZ3H6"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

window.initApp = function() {
  return {
    // Autenticación
    user: null,
    cargandoAuth: true,
    emailAuth: '',
    passAuth: '',
    modoRegistro: false,

    // Modo Oscuro / Claro
    darkMode: localStorage.getItem('pos_dark_mode') === 'true',

    // Datos del negocio
    keyword: '',
    menu: [],
    ingredientes: [],
    mesaSeleccionada: 1,
    totalMesasConfiguradas: 10,
    mesas: {},
    ventasRealizadas: [],
    ordenesCocina: [],
    
    // Control de Estado y Bloqueos
    procesandoCobro: false,
    procesandoComanda: false,
    pinAdmin: '1234',

    // Modales
    mostrarAdmin: false,
    mostrarReporte: false,
    mostrarInventario: false,
    mostrarCocina: false,

    // Formulario Producto
    nuevoNombre: '',
    nuevoPrecio: '',
    nuevaCategoria: 'Comida/Servicio',
    nuevoEmoji: '🍔',
    recetaProducto: [],

    // Formulario Ingrediente
    nuevoIngredienteNombre: '',
    nuevoIngredienteUnidad: 'pz',
    nuevoIngredienteCosto: '',
    nuevoIngredienteStock: 0,

    // Selección temporal para receta
    tempIngredienteId: '',
    tempIngredienteCantidad: '',

    // Referencias Firestore dinámicas
    productosRef: null,
    ventasRef: null,
    ingredientesRef: null,
    cocinaRef: null,

    initDatabase() {
      this.mostrarAdmin = false;
      this.mostrarReporte = false;
      this.mostrarInventario = false;
      this.mostrarCocina = false;

      auth.onAuthStateChanged((user) => {
        this.cargandoAuth = false;
        if (user) {
          this.user = user;
          const userBasePath = `users/${user.uid}`;
          this.productosRef = db.collection(`${userBasePath}/products`);
          this.ventasRef = db.collection(`${userBasePath}/sales`);
          this.ingredientesRef = db.collection(`${userBasePath}/ingredients`);
          this.cocinaRef = db.collection(`${userBasePath}/kitchen_orders`);

          this.cargarMesasLocales();
          this.cargarDatosUsuario();
        } else {
          this.user = null;
          this.menu = [];
          this.ingredientes = [];
          this.ventasRealizadas = [];
          this.ordenesCocina = [];
        }
      });
    },

    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      localStorage.setItem('pos_dark_mode', this.darkMode);
    },

    // --- PERSISTENCIA LOCAL DE MESAS ---
    cargarMesasLocales() {
      const guardado = localStorage.getItem(`pos_mesas_${this.user.uid}`);
      if (guardado) {
        try {
          this.mesas = JSON.parse(guardado);
        } catch(e) {
          this.actualizarEstructuraMesas();
        }
      } else {
        this.actualizarEstructuraMesas();
      }
    },

    guardarMesasLocales() {
      if (this.user) {
        localStorage.setItem(`pos_mesas_${this.user.uid}`, JSON.stringify(this.mesas));
      }
    },

    // --- ACCESO CON PIN DE ADMIN ---
    solicitarPinAdmin(accion) {
      const pin = prompt("Ingresa el PIN de Administrador (Por defecto: 1234):");
      if (pin === this.pinAdmin) {
        if (accion === 'admin') this.mostrarAdmin = true;
        if (accion === 'inventario') this.mostrarInventario = true;
        if (accion === 'reporte') this.mostrarReporte = true;
      } else if (pin !== null) {
        alert("PIN Incorrecto.");
      }
    },

    cambiarPinAdmin() {
      const nuevo = prompt("Ingresa tu nuevo PIN de Administrador (mínimo 4 dígitos):");
      if (nuevo && nuevo.length >= 4) {
        this.pinAdmin = nuevo;
        alert("¡PIN actualizado con éxito!");
      }
    },

    // --- AUTENTICACIÓN ---
    async procesarAuth() {
      if (!this.emailAuth || !this.passAuth) {
        alert("Ingresa correo y contraseña.");
        return;
      }
      try {
        if (this.modoRegistro) {
          await auth.createUserWithEmailAndPassword(this.emailAuth, this.passAuth);
          alert("¡Cuenta de negocio creada con éxito!");
        } else {
          await auth.signInWithEmailAndPassword(this.emailAuth, this.passAuth);
        }
        this.emailAuth = '';
        this.passAuth = '';
      } catch (error) {
        alert("Error de autenticación: " + error.message);
      }
    },

    async cerrarSesion() {
      if (confirm("¿Seguro que deseas cerrar sesión?")) {
        await auth.signOut();
      }
    },

    cargarDatosUsuario() {
      if (!this.user) return;

      this.productosRef.onSnapshot((snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        this.menu = items;
      });

      this.ingredientesRef.onSnapshot((snapshot) => {
        const ings = [];
        snapshot.forEach((doc) => {
          ings.push({ id: doc.id, ...doc.data() });
        });
        this.ingredientes = ings;
      });

      this.ventasRef.orderBy('fecha', 'desc').onSnapshot((snapshot) => {
        const ventas = [];
        snapshot.forEach((doc) => {
          ventas.push({ id: doc.id, ...doc.data() });
        });
        this.ventasRealizadas = ventas;
      });

      this.cocinaRef.where('estado', '==', 'pendiente').orderBy('fecha', 'asc').onSnapshot((snapshot) => {
        const ordenes = [];
        snapshot.forEach((doc) => {
          ordenes.push({ id: doc.id, ...doc.data() });
        });
        this.ordenesCocina = ordenes;
      });
    },

    actualizarEstructuraMesas() {
      const cantidad = parseInt(this.totalMesasConfiguradas) || 1;
      for (let i = 1; i <= cantidad; i++) {
        if (!this.mesas[i]) {
          this.mesas[i] = [];
        }
      }
      if (this.mesaSeleccionada > cantidad) {
        this.mesaSeleccionada = 1;
      }
      this.guardarMesasLocales();
    },

    // --- COMANDAS A COCINA ---
    async enviarComandaACocina() {
      if (this.cartActual.length === 0) {
        alert("Agrega platillos o bebidas a la mesa antes de enviar a cocina.");
        return;
      }

      this.procesandoComanda = true;
      try {
        await this.cocinaRef.add({
          mesa: this.mesaSeleccionada,
          items: this.cartActual.map(i => ({
            nombre: i.nombre,
            nota: i.nota || '',
            imagen: i.imagen || '🍔'
          })),
          estado: 'pendiente',
          fecha: new Date().toISOString(),
          horaTexto: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        alert(`¡Comanda enviada a la cocina para la Mesa/Socio ${this.mesaSeleccionada}!`);
      } catch (e) {
        alert("Error al enviar a cocina: " + e.message);
      } finally {
        this.procesandoComanda = false;
      }
    },

    async marcarOrdenLista(ordenId) {
      try {
        await this.cocinaRef.doc(ordenId).update({ estado: 'preparado' });
      } catch (e) {
        alert("Error al actualizar comanda: " + e.message);
      }
    },

    imprimirTicketMesa() {
      if (this.cartActual.length === 0) {
        alert("La mesa no tiene consumos para imprimir.");
        return;
      }
      window.print();
    },

    // --- AGREGAR CON MODIFICADORES / NOTAS ---
    addToCart(item) {
      if (!this.mesas[this.mesaSeleccionada]) {
        this.mesas[this.mesaSeleccionada] = [];
      }

      let nota = prompt(`¿Alguna especificación para "${item.nombre}"? (ej. Sin piña, extra salsa, bien cocido):`);
      if (nota === null) nota = '';

      this.mesas[this.mesaSeleccionada].push({ 
        ...item, 
        nota: nota.trim(),
        cartId: Date.now() + Math.random() 
      });
      this.guardarMesasLocales();
    },

    removeFromCart(index) {
      if (this.mesas[this.mesaSeleccionada]) {
        this.mesas[this.mesaSeleccionada].splice(index, 1);
        this.guardarMesasLocales();
      }
    },

    editarNotaItem(index) {
      const item = this.cartActual[index];
      let nuevaNota = prompt(`Editar especificación para "${item.nombre}":`, item.nota || '');
      if (nuevaNota !== null) {
        this.cartActual[index].nota = nuevaNota.trim();
        this.guardarMesasLocales();
      }
    },

    // --- INVENTARIO / INGREDIENTES ---
    async agregarIngrediente() {
      if (!this.nuevoIngredienteNombre || !this.nuevoIngredienteCosto) {
        alert("Ingresa el nombre y costo unitario del ingrediente.");
        return;
      }
      try {
        await this.ingredientesRef.add({
          nombre: this.nuevoIngredienteNombre,
          unidad: this.nuevoIngredienteUnidad,
          costoUnitario: parseFloat(this.nuevoIngredienteCosto),
          stock: parseFloat(this.nuevoIngredienteStock) || 0,
          usadoTotal: 0
        });
        this.nuevoIngredienteNombre = '';
        this.nuevoIngredienteCosto = '';
        this.nuevoIngredienteStock = 0;
        alert("¡Ingrediente agregado al inventario!");
      } catch (error) {
        alert("Error al guardar ingrediente: " + error.message);
      }
    },

    async actualizarCostoIngrediente(ing) {
      const nuevoCosto = prompt(`Nuevo costo unitario para "${ing.nombre}" (${ing.unidad}):`, ing.costoUnitario);
      if (nuevoCosto !== null && !isNaN(parseFloat(nuevoCosto))) {
        try {
          await this.ingredientesRef.doc(ing.id).update({
            costoUnitario: parseFloat(nuevoCosto)
          });
          alert("¡Costo actualizado!");
        } catch (error) {
          alert("Error al actualizar costo: " + error.message);
        }
      }
    },

    async actualizarStockIngrediente(ing) {
      const nuevoStock = prompt(`Cantidad en Stock de "${ing.nombre}" (${ing.unidad}):`, ing.stock);
      if (nuevoStock !== null && !isNaN(parseFloat(nuevoStock))) {
        try {
          await this.ingredientesRef.doc(ing.id).update({
            stock: parseFloat(nuevoStock)
          });
        } catch (error) {
          alert("Error al actualizar stock: " + error.message);
        }
      }
    },

    async reiniciarContadoresGasto() {
      if (confirm("¿Deseas reiniciar los contadores de consumo gastado a 0?")) {
        try {
          const batch = db.batch();
          this.ingredientes.forEach(ing => {
            batch.update(this.ingredientesRef.doc(ing.id), { usadoTotal: 0 });
          });
          await batch.commit();
          alert("Contadores de gasto reiniciados a 0.");
        } catch (e) {
          alert("Error al reiniciar: " + e.message);
        }
      }
    },

    async eliminarIngrediente(id) {
      if (confirm("¿Borrar este ingrediente del inventario?")) {
        await this.ingredientesRef.doc(id).delete();
      }
    },

    // --- RECETA EN PRODUCTOS ---
    agregarIngredienteAReceta() {
      if (!this.tempIngredienteId || !this.tempIngredienteCantidad) {
        alert("Selecciona un ingrediente y especifica la cantidad usada.");
        return;
      }
      const ingObj = this.ingredientes.find(i => i.id === this.tempIngredienteId);
      if (!ingObj) return;

      this.recetaProducto.push({
        ingredienteId: ingObj.id,
        nombre: ingObj.nombre,
        unidad: ingObj.unidad,
        cantidad: parseFloat(this.tempIngredienteCantidad)
      });

      this.tempIngredienteId = '';
      this.tempIngredienteCantidad = '';
    },

    quitarIngredienteDeReceta(index) {
      this.recetaProducto.splice(index, 1);
    },

    calcularCostoProduccion(receta) {
      if (!receta || !Array.isArray(receta)) return 0;
      let totalCosto = 0;
      receta.forEach(item => {
        const ingObj = this.ingredientes.find(i => i.id === item.ingredienteId);
        if (ingObj) {
          totalCosto += (ingObj.costoUnitario * item.cantidad);
        }
      });
      return totalCosto;
    },

    getGastoMonetarioIngrediente(ing) {
      const cantidadConsumida = parseFloat(ing.usadoTotal) || 0;
      const costoUnitario = parseFloat(ing.costoUnitario) || 0;
      return cantidadConsumida * costoUnitario;
    },

    getTotalGastoInsumosGeneral() {
      return this.ingredientes.reduce((sum, ing) => sum + this.getGastoMonetarioIngrediente(ing), 0);
    },

    // --- PRODUCTOS ---
    async agregarProductoWeb() {
      if (!this.nuevoNombre || !this.nuevoPrecio) {
        alert("Por favor ingresa nombre y precio del producto.");
        return;
      }
      try {
        await this.productosRef.add({
          nombre: this.nuevoNombre,
          precio: parseFloat(this.nuevoPrecio),
          categoria: this.nuevaCategoria || 'General',
          imagen: this.nuevoEmoji || '🏷️',
          receta: this.recetaProducto
        });
        this.nuevoNombre = '';
        this.nuevoPrecio = '';
        this.nuevoEmoji = '🏷️';
        this.recetaProducto = [];
        alert("¡Producto guardado exitosamente!");
      } catch (error) {
        alert("Error al guardar: " + error.message);
      }
    },

    async eliminarProductoWeb(id) {
      if (confirm("¿Deseas borrar este producto?")) {
        await this.productosRef.doc(id).delete();
      }
    },

    get cartActual() {
      return this.mesas[this.mesaSeleccionada] || [];
    },

    getTotalMesa(numeroMesa) {
      const items = this.mesas[numeroMesa] || [];
      return items.reduce((sum, item) => sum + (Number(item.precio) || 0), 0);
    },

    getTotalActual() {
      return this.getTotalMesa(this.mesaSeleccionada);
    },

    async cobrarMesa() {
      if (this.procesandoCobro) return;

      const total = this.getTotalActual();
      if (total === 0) {
        alert("La mesa o socio no tiene consumos pedidos.");
        return;
      }

      if (confirm(`¿Cobrar $${total.toFixed(2)} a la Mesa/Socio ${this.mesaSeleccionada} y cerrar la cuenta?`)) {
        this.procesandoCobro = true;
        try {
          const batch = db.batch();

          for (const item of this.cartActual) {
            if (item.receta && Array.isArray(item.receta)) {
              for (const ingItem of item.receta) {
                const ingDocRef = this.ingredientesRef.doc(ingItem.ingredienteId);
                const ingSnap = await ingDocRef.get();
                if (ingSnap.exists) {
                  const data = ingSnap.data();
                  const nuevoStock = (data.stock || 0) - ingItem.cantidad;
                  const nuevoUsadoTotal = (data.usadoTotal || 0) + ingItem.cantidad;
                  batch.update(ingDocRef, {
                    stock: nuevoStock,
                    usadoTotal: nuevoUsadoTotal
                  });
                }
              }
            }
          }

          const nuevaVentaRef = this.ventasRef.doc();
          batch.set(nuevaVentaRef, {
            mesa: this.mesaSeleccionada,
            total: total,
            items: this.cartActual.map(i => ({ nombre: i.nombre, precio: i.precio, nota: i.nota || '', receta: i.receta || [] })),
            fecha: new Date().toISOString(),
            fechaTexto: new Date().toLocaleString()
          });

          await batch.commit();

          this.mesas[this.mesaSeleccionada] = [];
          this.guardarMesasLocales();
          alert(`¡Venta cobrada e inventario/gastos actualizados!`);
        } catch (error) {
          alert("Error al registrar cobro: " + error.message);
        } finally {
          this.procesandoCobro = false;
        }
      }
    },

    getTotalVentas() {
      return this.ventasRealizadas.reduce((sum, v) => sum + (Number(v.total) || 0), 0);
    },

    priceFormat(price) {
      return '$' + Number(price || 0).toFixed(2);
    }
  };
};
