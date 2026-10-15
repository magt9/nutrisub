// Base de Datos Nutricional Profesional de Referencia
const catalogoAlimentos = [
    {
        grupo: "🥩 PROTEÍNAS (100g cocido aprox. = 20–25g proteína)",
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        items: [
            "Carnes magras: Pechuga de pollo, carne magra de res, pechuga de pavo.",
            "Pescados: Salmón, atún en agua, filete de tilapia o merluza.",
            "Vegetales proteicos: Soya texturizada, tofu, tempeh.",
            "Leguminosas (aporta proteína + carbohidrato): Lentejas, garbanzos, frijoles, habas."
        ]
    },
    {
        grupo: "🧀 LÁCTEOS (50g – 100g aprox.)",
        color: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
        items: [
            "Queso panela, requesón o queso Oaxaca ligero.",
            "Yogurt griego natural sin azúcar.",
            "Leche deslactosada o bebida vegetal fortificada."
        ]
    },
    {
        grupo: "🌾 CARBOHIDRATOS COMPLEJOS (1 porción ≈ 20–25g CH)",
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        items: [
            "Tortillas de maíz: 1 pieza = 1 porción.",
            "Pan integral: 1 rebanada = 1 porción.",
            "Avena en hojuelas: 1/3 de taza cruda (o 1/2 taza cocida) = 1 porción.",
            "Arroz integral o blanco: 1/2 taza cocido = 1 porción.",
            "Pasta integral: 1/2 taza cocida = 1 porción.",
            "Papa o camote cocido: 1/2 pieza (100g) = 1 porción."
        ]
    },
    {
        grupo: "🥦 VERDURAS (1 porción = 40g - 80g aprox.)",
        color: "text-green-700",
        bg: "bg-green-50",
        border: "border-green-200",
        items: [
            "Libres y altas en fibra: Espinaca, lechuga, brócoli, calabacita, zanahoria, jitomate, pepino, nopales."
        ]
    },
    {
        grupo: "🍎 FRUTAS (1 porción = 1 pieza o 1 taza)",
        color: "text-purple-600",
        bg: "bg-purple-50",
        border: "border-purple-200",
        items: [
            "Manzana, plátano (1/2 pieza), mango, fresas (1 taza), papaya en cubos (1 taza), piña o uvas."
        ]
    },
    {
        grupo: "🥑 GRASAS SALUDABLES (1 porción ≈ 5–10g grasa)",
        color: "text-yellow-600",
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        items: [
            "Aguacate: 1/4 a 1/3 de pieza.",
            "Aceite de oliva virgen extra: 1 cucharadita.",
            "Nueces o almendras: 10 a 12 piezas.",
            "Semillas de chía o linaza: 1 cucharada."
        ]
    }
];

document.getElementById('nutritionForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const edad = parseInt(document.getElementById('edad').value);
    const peso = parseFloat(document.getElementById('peso').value);
    const estatura = parseInt(document.getElementById('estatura').value);
    const sexo = document.getElementById('sexo').value;
    const actividad = parseFloat(document.getElementById('actividad').value);
    const objetivo = document.getElementById('objetivo').value;

    document.getElementById('lblEdad').innerText = edad;
    document.getElementById('lblSexo').innerText = sexo === 'M' ? 'Masculino' : 'Femenino';
    document.getElementById('lblPeso').innerText = peso;
    document.getElementById('lblEstatura').innerText = estatura;
    document.getElementById('lblObjetivo').innerText = objetivo;

    // Cálculo TMB (Mifflin-St Jeor)
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
    const calProteina = grProteina * 4;

    const grGrasa = peso * 0.9;
    const calGrasa = grGrasa * 9;

    const calCarbos = caloriasObjetivo - calProteina - calGrasa;
    const grCarbos = calCarbos / 4;

    document.getElementById('resCalorias').innerText = Math.round(caloriasObjetivo) + " kcal";
    document.getElementById('resProtes').innerText = Math.round(grProteina) + " g";
    document.getElementById('resGrasas').innerText = Math.round(grGrasa) + " g";
    document.getElementById('resCarbos').innerText = Math.round(grCarbos) + " g";

    // Generar distribución práctica por comidas
    generarTablaDistribucion(grProteina, grCarbos);
    generarEjemplosComidas();
    generarCatalogo();

    document.getElementById('resultsContainer').classList.remove('hidden');
    document.getElementById('printProfile').classList.remove('hidden');
});

function generarTablaDistribucion(grProteina, grCarbos) {
    const tabla = document.getElementById('tablaDistribucion');
    
    // Distribución proporcional para 3 comidas principales
    const protDesayuno = Math.round((grProteina * 0.3) / 20) * 50; // en gramos de alimento (bloques de 50g)
    const protComida = Math.round((grProteina * 0.45) / 20) * 50;
    const protCena = Math.round((grProteina * 0.25) / 20) * 50;

    const carbDesayuno = Math.round((grCarbos * 0.3) / 25); // en porciones (1 porción ≈ 25g CH)
    const carbComida = Math.round((grCarbos * 0.5) / 25);
    const carbCena = Math.max(1, Math.round((grCarbos * 0.2) / 25));

    tabla.innerHTML = `
        <tr class="bg-white">
            <td class="px-3 py-3 border-r font-bold text-emerald-800">🥣 Desayuno</td>
            <td class="px-3 py-3 border-r font-bold">${protDesayuno} g</td>
            <td class="px-3 py-3 border-r">100 g</td>
            <td class="px-3 py-3 border-r">50 g</td>
            <td class="px-3 py-3 border-r font-bold">${carbDesayuno} porciones</td>
            <td class="px-3 py-3 border-r">1 pieza</td>
            <td class="px-3 py-3 text-gray-500">1 porción</td>
        </tr>
        <tr class="bg-gray-50">
            <td class="px-3 py-3 border-r font-bold text-emerald-800">🍛 Comida</td>
            <td class="px-3 py-3 border-r font-bold">${protComida} g</td>
            <td class="px-3 py-3 border-r">50 g</td>
            <td class="px-3 py-3 border-r">100 g</td>
            <td class="px-3 py-3 border-r font-bold">${carbComida} porciones</td>
            <td class="px-3 py-3 border-r">1 pieza</td>
            <td class="px-3 py-3 text-gray-500">1 porción</td>
        </tr>
        <tr class="bg-white">
            <td class="px-3 py-3 border-r font-bold text-emerald-800">🌮 Cena</td>
            <td class="px-3 py-3 border-r font-bold">${protCena} g</td>
            <td class="px-3 py-3 border-r">100 g</td>
            <td class="px-3 py-3 border-r">50 g</td>
            <td class="px-3 py-3 border-r font-bold">${carbCena} porciones</td>
            <td class="px-3 py-3 border-r">1 pieza</td>
            <td class="px-3 py-3 text-gray-500">1 porción</td>
        </tr>
    `;
}

function generarEjemplosComidas() {
    const contenedor = document.getElementById('ejemplosComidas');
    contenedor.innerHTML = `
        <div class="border p-4 rounded-lg bg-emerald-50/50 border-emerald-200">
            <h3 class="font-bold text-emerald-800 text-base mb-2 border-b pb-1">🥣 Desayuno</h3>
            <p class="text-xs text-gray-600 mb-2"><strong>Selección sugerida:</strong> Proteína + Lácteo + Carbohidratos + Fruta + Verduras.</p>
            <div class="bg-white p-3 rounded text-xs text-gray-700 space-y-1 border">
                <p class="font-bold text-emerald-700">Ejemplo práctico:</p>
                <p>Quesadillas (2 tortillas de maíz + 100g de queso panela + espinacas salteadas) + 1 plátano + 1 taza de té o café sin azúcar.</p>
            </div>
        </div>

        <div class="border p-4 rounded-lg bg-emerald-50/50 border-emerald-200">
            <h3 class="font-bold text-emerald-800 text-base mb-2 border-b pb-1">🍛 Comida</h3>
            <p class="text-xs text-gray-600 mb-2"><strong>Selección sugerida:</strong> Proteína fuerte + Carbohidratos complejos + Ensalada abundante + Fruta.</p>
            <div class="bg-white p-3 rounded text-xs text-gray-700 space-y-1 border">
                <p class="font-bold text-emerald-700">Ejemplo práctico:</p>
                <p>Pechuga de pollo a la plancha + 1/2 taza de arroz + 1/2 taza de frijoles + ensalada de brócoli y zanahoria + 1 pieza de mango o manzana.</p>
            </div>
        </div>

        <div class="border p-4 rounded-lg bg-emerald-50/50 border-emerald-200">
            <h3 class="font-bold text-emerald-800 text-base mb-2 border-b pb-1">🌮 Cena</h3>
            <p class="text-xs text-gray-600 mb-2"><strong>Selección sugerida:</strong> Proteína ligera + Lácteo/Requesón + Carbohidrato moderado + Verduras.</p>
            <div class="bg-white p-3 rounded text-xs text-gray-700 space-y-1 border">
                <p class="font-bold text-emerald-700">Ejemplo práctico:</p>
                <p>Tostadas de requesón (100g) con nopales guisados + 1/3 taza de lentejas + 1 taza de papaya picada.</p>
            </div>
        </div>
    `;
}

function generarCatalogo() {
    const contenedor = document.getElementById('catalogoAlimentos');
    contenedor.innerHTML = '';

    catalogoAlimentos.forEach(cat => {
        let itemsHTML = cat.items.map(i => `<li class="py-1 flex items-center"><i class="fa-solid fa-check text-emerald-500 mr-2"></i>${i}</li>`).join('');

        contenedor.innerHTML += `
            <div class="border rounded-lg p-4 ${cat.bg} ${cat.border}">
                <h3 class="font-bold text-sm ${cat.color} uppercase mb-2">${cat.grupo}</h3>
                <ul class="text-xs text-gray-700 bg-white p-3 rounded border border-gray-200 space-y-1">
                    ${itemsHTML}
                </ul>
            </div>
        `;
    });
}
