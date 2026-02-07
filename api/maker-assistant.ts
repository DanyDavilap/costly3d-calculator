const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_PRIMARY = "gemini-1.5-flash";
const MODEL_FALLBACK = "gemini-1.5-pro";

const SYSTEM_PROMPT = `Eres "Asistente Maker 3D", un experto en impresión 3D de juguetes articulados (materiales PLA y PETG).
Tu tono es claro, concreto y accionable. Siempre devuelves JSON EXACTO en español.
Enfócate en:
- Diagnóstico de problemas de movilidad, tolerancias, warping, stringing, layer adhesion.
- Ajustes en slicer tipo Bambu/Prusa (velocidad, flow, retracción, temperatura, cooling, z-hop, shells, infill, supports, ironing, primera capa).
- QA de piezas articuladas: juego, fricción, limpieza de soportes, holguras (0.1-0.3 mm), limpieza de bisagras/ball joints.
- Seguridad: evita sugerir solventes o riesgos químicos innecesarios; prioriza ajustes de slicer y material.
- Plan de prueba: pasos breves con cambios 1 a 1 y criterio de éxito.
- Prevención: hábitos para que no vuelva a ocurrir.
Debes responder SOLO JSON con esta forma exacta:
{
  "diagnostico": string[],
  "checklist": string[],
  "ajustes": { "item": string, "valor_sugerido": string, "por_que": string }[],
  "plan_prueba": { "paso": string, "cambio": string, "esperado": string }[],
  "prevencion": string[],
  "mensaje_cliente": string
}`;

type AssistantPayload = {
  diagnostico: string[];
  checklist: string[];
  ajustes: { item: string; valor_sugerido: string; por_que: string }[];
  plan_prueba: { paso: string; cambio: string; esperado: string }[];
  prevencion: string[];
  mensaje_cliente: string;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const badRequest = (message: string) => jsonResponse({ ok: false, error: message }, 400);

async function callGemini(model: string, text: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no está configurada");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    systemInstruction: {
      role: "system",
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Caso del maker:\n${text}\n\nResponde SOLO JSON válido sin texto adicional. Si no puedes, responde JSON con un error breve.`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      topP: 0.9,
      maxOutputTokens: 800,
    },
  } as const;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const textBody = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${textBody}`);
  }
  const data = (await res.json()) as any;
  const candidate = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    throw new Error("Gemini no devolvió texto utilizable");
  }
  return candidate;
}

function tryParseJson(raw: string): AssistantPayload | null {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/, "");
    const parsed = JSON.parse(cleaned);
    const requiredKeys = [
      "diagnostico",
      "checklist",
      "ajustes",
      "plan_prueba",
      "prevencion",
      "mensaje_cliente",
    ];
    for (const key of requiredKeys) {
      if (!(key in parsed)) return null;
    }
    return parsed as AssistantPayload;
  } catch {
    return null;
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Método no permitido" }, 405);
  }

  let payload: { text?: string } = {};
  try {
    payload = (await req.json()) as { text?: string };
  } catch {
    return badRequest("Body debe ser JSON.");
  }

  const text = payload.text?.toString?.().trim?.() ?? "";
  if (!text) return badRequest("El campo 'text' es requerido.");
  if (text.length > 1200) return badRequest("El texto supera los 1200 caracteres.");

  try {
    let raw = await callGemini(MODEL_PRIMARY, text);
    let parsed = tryParseJson(raw);
    if (!parsed) {
      raw = await callGemini(
        MODEL_FALLBACK,
        `${text}\n\nDEVUELVE SOLO JSON válido, sin markdown, sin explicación. Usa exactamente las claves solicitadas.`
      );
      parsed = tryParseJson(raw);
    }
    if (!parsed) {
      return jsonResponse(
        { ok: false, error: "No pudimos generar una respuesta estructurada. Intenta de nuevo." },
        502
      );
    }
    return jsonResponse({ ok: true, result: parsed }, 200);
  } catch (error) {
    console.error("maker-assistant", error);
    return jsonResponse({ ok: false, error: "No se pudo procesar la solicitud. Intenta nuevamente." }, 500);
  }
}
