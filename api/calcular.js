export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const perfil = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API Key de Gemini no configurada' });
  }

  const prompt = `
    Actúa como un nutriólogo clínico experto. 
    Tengo un paciente con los siguientes datos:
    - Nombre: ${perfil.nombre}
    - Edad: ${perfil.edad}, Sexo:${perfil.sexo}
    - Peso: ${perfil.peso} kg, Estatura:${perfil.estatura} cm
    - Actividad (PAL): ${perfil.actividad}
    - Objetivo: ${perfil.objetivo}
    - Padecimiento: ${perfil.padecimiento}
    - Grasa Corporal: ${perfil.grasaCorporal ? perfil.grasaCorporal + '%' : 'No especificada'}
    - Metabolismo Basal Medido: ${perfil.metabolismoBasal ? perfil.metabolismoBasal + ' kcal' : 'No especificado'}

    Calcula sus requerimientos energéticos y macronutricionales exactos. Ajusta clínicamente las restricciones si tiene algún padecimiento (ej. sin grasas en hepatitis, baja proteína en renal).

    DEVUELVE ESTRICTAMENTE UN JSON VÁLIDO CON ESTA ESTRUCTURA EXACTA (sin comillas invertidas, sin markdown de \`\`\`json, solo el objeto puro):
    {
      "nombre": "${perfil.nombre}",
      "nombrePadecimiento": "Nombre clínico del padecimiento",
      "indicacionClinica": "Explicación médica concisa de las restricciones",
      "metodoBasal": "Fórmula usada o Bioimpedancia",
      "calorias": 2000,
      "proteinas": 150,
      "carbos": 200,
      "grasas": 60,
      "metasPuras": {
        "desayunoProtPura": 45,
        "comidaProtPura": 70,
        "cenaProtPura": 35
      },
      "equivalencias": {
        "desayuno": { "pollo": 150, "res": 170, "atun": 180, "claras": 12 },
        "comida": { "pollo": 220, "pescado": 310, "res": 260 },
        "cena": { "atun": 140, "pollo": 110 }
      },
      "dist": {
        "desayunoLacteo": "100 g",
        "comidaLacteo": "50 g",
        "cenaLacteo": "100 g",
        "desayunoVerd": 40,
        "comidaVerd": 80,
        "cenaVerd": 40,
        "desayunoCarb": 2,
        "comidaCarb": 3,
        "cenaCarb": 1
      }
    }
  `;

  try {
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    });

    const data = await geminiRes.json();
    const textoRespuesta = data.candidates[0].content.parts[0].text;
    const planGenerado = JSON.parse(textoRespuesta);
    
    return res.status(200).json(planGenerado);

  } catch (error) {
    console.error("Error conectando con Gemini:", error);
    return res.status(500).json({ error: 'Error al generar el plan con IA' });
  }
}
