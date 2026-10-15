// Base de Datos de Equivalentes Simplificada
const equivalentesDB = {
    proteinas: {
        nombre: "Proteínas",
        color: "text-red-600",
        bg: "bg-red-50",
        opciones: "30g pollo/res/pescado, 1 huevo, 1/2 taza lentejas, 30g panela, 2 rebanadas jamón pavo."
    },
    carbohidratos: {
        nombre: "Cereales",
        color: "text-blue-600",
        bg: "bg-blue-50",
        opciones: "1 tortilla maíz, 1/2 taza arroz/avena, 1 pan integral, 1/2 papa."
    },
    grasas: {
        nombre: "Grasas",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        opciones: "1/3 aguacate, 10 almendras, 1 cdta aceite oliva, 1 cda crema cacahuate."
    },
    verduras: {
        nombre: "Verduras",
        color: "text-green-600",
        bg: "bg-green-50",
        opciones: "1 taza brócoli/espinaca, 1/2 taza zanahoria/calabaza, 1 jitomate."
    },
    frutas: {
        nombre: "Frutas",
        color: "text-purple-600",
        bg: "bg-purple-50",
        opciones: "1 manzana/naranja, 1 taza papaya/melón, 1/2 plátano."
    }
};

// Evento que se dispara al enviar el formulario
document.getElementById('nutritionForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // Obtener los datos del formulario
    const edad = parseInt(document.getElementById('edad').value);
    const peso = parseFloat(document.getElementById('peso').value);
    const estatura = parseInt(document.getElementById('estatura').value);
    const sexo = document.getElementById('sexo').value;
    const actividad = parseFloat(document.getElementById('actividad').value);
    const objetivo = document.getElementById('objetivo').value;

    // Llenar datos ocultos para impresión
    document.getElementById('lblEdad').innerText = edad;
    document.getElementById('lblSexo').innerText = sexo === 'M' ? 'Masculino' : 'Femenino';
    document.getElementById('lblPeso').innerText = peso;
    document.getElementById('lblEstatura').innerText = estatura;
    document.getElementById('lblObjetivo').innerText = objetivo;

    // 1. Fórmula de Tasa Metabólica Basal (Mifflin-St Jeor)
    let tmb = (10 * peso) + (6.25 * estatura) - (5 * edad);
    tmb += (sexo === 'M') ? +5 : -161;

    // 2. Calorías de mantenimiento
    let caloriasMantenimiento = tmb * actividad;
    let caloriasObjetivo = caloriasMantenimiento;
    let gramosProteinaXKg = 1.8;

    // 3. Ajuste según el objetivo elegido
    switch (objetivo) {
        case 'bajar':
            caloriasObjetivo -= 500; // Déficit conservador
            gramosProteinaXKg = 2.0;
            break;
        case 'definir':
            caloriasObjetivo -= 800; // Déficit agresivo
            gramosProteinaXKg = 2.2;
            break;
        case 'tonificar':
            caloriasObjetivo -= 200; // Déficit leve
            gramosProteinaXKg = 2.0;
            break;
        case 'masa':
            caloriasObjetivo += 400; // Superávit
            gramosProteinaXKg = 1.8;
            break;
    }

    // Proteger calorías mínimas saludables
    if (sexo === 'F' && caloriasObjetivo < 1200) caloriasObjetivo = 1200;
    if (sexo === 'M' && caloriasObjetivo < 1500) caloriasObjetivo = 1500;

    // 4. Calcular gramos de Macronutrientes
    const grProteina = peso * gramosProteinaXKg;
    const calProteina = grProteina * 4;

    const grGrasa = peso * 0.9; 
    const calGrasa = grGrasa * 9;

    const calCarbos = caloriasObjetivo - calProteina - calGrasa;
    const grCarbos = calCarbos / 4;

    // Mostrar calorías y macronutrientes en la pantalla
    document.getElementById('resCalorias').innerText = Math.round(caloriasObjetivo) + " kcal";
    document.getElementById('resProtes').innerText = Math.round(grProteina) + " g";
    document.getElementById('resGrasas').innerText = Math.round(grGrasa) + " g";
    document.getElementById('resCarbos').innerText = Math.round(grCarbos) + " g";

    // 5. Calcular número de Porciones
    const porcionesProteina = Math.round(grProteina / 7);
    const porcionesGrasa = Math.round(grGrasa / 5);
    const porcionesCarbo = Math.round((grCarbos - 30) / 15);
    const porcionesVerdura = 4;
    const porcionesFruta = objetivo === 'bajar' || objetivo === 'definir' ? 2 : 3;

    // Enviar a la función de renderizado
    renderPorciones(porcionesProteina, porcionesCarbo, porcionesGrasa, porcionesVerdura, porcionesFruta);

    // Hacer visible la sección de resultados
    document.getElementById('resultsContainer').classList.remove('hidden');
    document.getElementById('printProfile').classList.remove('hidden');
});

// Función para mostrar las tarjetas de porciones
function renderPorciones(prot, carbo, grasa, verd, frut) {
    const grid = document.getElementById('porcionesGrid');
    grid.innerHTML = ''; // Limpiar grilla anterior

    const data = [
        { id: 'proteinas', qty: prot },
        { id: 'carbohidratos', qty: carbo },
        { id: 'grasas', qty: grasa },
        { id: 'verduras', qty: verd },
        { id: 'frutas', qty: frut }
    ];

    data.forEach(item => {
        const info = equivalentesDB[item.id];
        // Solo mostrar si tiene más de 0 porciones
        if(item.qty > 0) {
            grid.innerHTML += `
                <div class="border rounded p-4 text-center flex flex-col justify-between ${info.bg} print:border-gray-300">
                    <h3 class="font-bold text-sm ${info.color} uppercase">${info.nombre}</h3>
                    <p class="text-3xl font-black text-gray-800 my-2">${item.qty} <span class="text-xs font-normal text-gray-600">porc.</span></p>
                    <div class="text-xs text-gray-700 text-left mt-2 border-t border-gray-200 pt-2 print:text-[10px]">
                        ${info.opciones}
                    </div>
                </div>
            `;
        }
    });
}
