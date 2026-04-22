/**
 * Edge Function: shipping-quote
 *
 * Recebe CEP de origem (vendedor), CEP de destino (comprador) e dimensões do
 * pacote. Consulta a API do Melhor Envio server-side e retorna as cotações.
 *
 * O token do Melhor Envio nunca sai do servidor.
 *
 * Secrets necessários (Supabase Dashboard → Edge Functions → Secrets):
 *   MELHOR_ENVIO_TOKEN    = <token_melhor_envio>
 *   MELHOR_ENVIO_BASE_URL = https://sandbox.melhorenvio.com.br/api/v2  (dev)
 *                         = https://melhorenvio.com.br/api/v2           (prod)
 *
 * Para trocar de sandbox → produção basta atualizar MELHOR_ENVIO_BASE_URL,
 * sem alterar código ou fazer redeploy.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ─── Secrets (nada hardcoded) ─────────────────────────────────────────────────

const MELHOR_ENVIO_TOKEN    = Deno.env.get("MELHOR_ENVIO_TOKEN")    ?? "";
const MELHOR_ENVIO_BASE_URL = Deno.env.get("MELHOR_ENVIO_BASE_URL") ?? "";

// Serviços: 1=PAC, 2=SEDEX, 3=SEDEX10, 4=SEDEX12, 17=Mini Envios
const SERVICES = "1,2,3,4,17";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Remove não-dígitos e valida exatamente 8 dígitos. */
function sanitizeCEP(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}

function clampNumber(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

// ─── Handler ─────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Body inválido" }, 400);
  }

  if (!body || typeof body !== "object") {
    return jsonResponse({ error: "Body inválido" }, 400);
  }

  const { fromPostalCode, toPostalCode, package: pkg } = body as Record<string, unknown>;

  // ── Validação ──────────────────────────────────────────────────────────────
  const safeFrom = sanitizeCEP(fromPostalCode);
  const safeTo   = sanitizeCEP(toPostalCode);

  if (!safeFrom) {
    return jsonResponse({ error: "CEP de origem do vendedor inválido" }, 422);
  }
  if (!safeTo) {
    return jsonResponse({ error: "CEP de destino inválido (8 dígitos necessários)" }, 422);
  }
  if (!MELHOR_ENVIO_TOKEN) {
    return jsonResponse({ error: "Serviço de frete não configurado" }, 500);
  }
  if (!MELHOR_ENVIO_BASE_URL) {
    return jsonResponse({ error: "Serviço de frete não configurado" }, 500);
  }

  const pkgObj = (pkg && typeof pkg === "object") ? pkg as Record<string, unknown> : {};
  const weight = clampNumber(pkgObj.weight, 0.1, 30,  0.5);
  const height = clampNumber(pkgObj.height, 1,   200, 15);
  const width  = clampNumber(pkgObj.width,  1,   200, 15);
  const length = clampNumber(pkgObj.length, 1,   200, 20);

  // ── Chamada Melhor Envio ───────────────────────────────────────────────────
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${MELHOR_ENVIO_BASE_URL}/me/shipment/calculate`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${MELHOR_ENVIO_TOKEN}`,
        "User-Agent": "Mercado3D/1.0 (castrosandro2@gmail.com)",
      },
      body: JSON.stringify({
        from:    { postal_code: safeFrom },
        to:      { postal_code: safeTo },
        package: { height, width, length, weight },
        options: { receipt: false, own_hand: false },
        services: SERVICES,
      }),
    });

    if (response.status === 401) return jsonResponse({ error: "Token inválido" }, 502);
    if (response.status === 422) return jsonResponse({ error: "Dados de envio inválidos" }, 422);
    if (response.status === 429) return jsonResponse({ error: "Limite de requisições atingido. Tente novamente." }, 429);
    if (!response.ok)            return jsonResponse({ error: `Erro na API de frete (${response.status})` }, 502);

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      return jsonResponse({ error: "Resposta inesperada da API de frete" }, 502);
    }

    const quotes = data
      .filter((opt) => opt && typeof opt.id === "number" && !opt.error)
      .map((opt) => ({
        id:            opt.id,
        name:          String(opt.name ?? ""),
        company: {
          id:      Number(opt.company?.id   ?? 0),
          name:    String(opt.company?.name ?? ""),
          picture: opt.company?.picture ?? null,
        },
        price:          String(opt.price        ?? "0"),
        custom_price:   String(opt.custom_price ?? opt.price ?? "0"),
        discount:       String(opt.discount     ?? "0"),
        delivery_time:  Number(opt.delivery_time ?? 0),
        delivery_range: {
          min: Number(opt.delivery_range?.min ?? opt.delivery_time ?? 0),
          max: Number(opt.delivery_range?.max ?? opt.delivery_time ?? 0),
        },
      }));

    if (quotes.length === 0) {
      return jsonResponse({ error: "Nenhuma opção de frete disponível para este CEP" }, 200);
    }

    return jsonResponse({ quotes });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return jsonResponse({ error: "Timeout ao consultar frete" }, 504);
    }
    return jsonResponse({ error: "Erro interno ao calcular frete" }, 500);
  } finally {
    clearTimeout(timeout);
  }
});
