import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { title, category, brand } = await req.json();

    if (!title) {
      return new Response(JSON.stringify({ error: "title required" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

    const prompt = `Você é um especialista em e-commerce de impressão 3D com profundo conhecimento de impressoras, filamentos, peças e acessórios do mercado.

Sua tarefa: dado o título de um anúncio, identificar quais características fazem sentido como variantes e sugerir valores realistas para cada uma.

Exemplos de raciocínio correto:

Título: "Filamento PLA+ 1kg"
Resposta: [{"name":"Cor","values":["Preto","Branco","Cinza","Vermelho","Azul","Verde"]},{"name":"Diâmetro","values":["1.75mm","2.85mm"]}]

Título: "Creality Ender 3 V3"
Resposta: [{"name":"Tensão","values":["110V","220V","Bivolt"]},{"name":"Kit","values":["Impressora apenas","Com upgrade hotend","Com enclosure"]}]

Título: "Creality Hi Combo"
Resposta: [{"name":"Kit","values":["Com AMS","Sem AMS"]},{"name":"Tensão","values":["110V","220V","Bivolt"]}]

Título: "BambuLab A1 Mini"
Resposta: [{"name":"Versão","values":["Impressora apenas","Combo com AMS Lite"]},{"name":"Cor","values":["Branco","Cinza"]}]

Título: "Roda Dentada GT2 20 dentes"
Resposta: [{"name":"Furo","values":["5mm","8mm"]},{"name":"Material","values":["Alumínio","POM"]}]

Título: "Mesa Aquecida Ender 3"
Resposta: [{"name":"Tensão","values":["12V","24V"]},{"name":"Tamanho","values":["235x235mm","310x310mm"]}]

Título: "Hotend Volcano"
Resposta: [{"name":"Diâmetro do bico","values":["0.4mm","0.6mm","0.8mm","1.0mm"]},{"name":"Tensão","values":["12V","24V"]}]

Título: "Parafuso M3"
Resposta: [{"name":"Comprimento","values":["6mm","8mm","10mm","12mm","16mm","20mm"]},{"name":"Tipo","values":["Allen","Phillips","Torx"]}]

Título: "Impressora 3D de Resina MSLA"
Resposta: [{"name":"Tamanho da tela","values":["6 polegadas","8 polegadas","10 polegadas"]},{"name":"Resolução","values":["4K","8K","12K"]}]

Título: "Extrusor BMG Clone"
Resposta: [{"name":"Lado","values":["Esquerdo","Direito"]},{"name":"Material","values":["ABS","Metal"]}]

Agora responda para:
Título: "${title}"${brand ? `\nMarca: ${brand} (use esse conhecimento de marca para inferir variações específicas desse fabricante)` : ""}${category ? `\nCategoria: ${category} (use a categoria para entender o tipo de produto e suas variações típicas)` : ""}

Regras:
- Use seu conhecimento real do mercado de impressão 3D para sugerir variações que realmente existem para esse produto
- Máximo 3 atributos
- Máximo 6 valores por atributo
- Valores curtos e objetivos
- Se não houver variações conhecidas, retorne []
- Responda APENAS com o JSON, sem texto adicional`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic error: ${err}`);
    }

    const result = await response.json();
    const text = (result.content?.[0]?.text ?? "[]")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();
    console.log("Anthropic raw text:", text);

    let attributes: Array<{ name: string; values: string[] }> = [];
    try {
      attributes = JSON.parse(text);
      if (!Array.isArray(attributes)) attributes = [];
    } catch (e) {
      console.error("JSON parse error:", e, "text:", text);
      attributes = [];
    }
    console.log("suggest-variants response:", JSON.stringify({ title, brand, category, attributes }));

    return new Response(JSON.stringify({ attributes }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("suggest-variants error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
