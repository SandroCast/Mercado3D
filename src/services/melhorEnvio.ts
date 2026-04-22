import { supabase } from "../lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShippingPackage {
  weight: number; // kg
  height: number; // cm
  width:  number; // cm
  length: number; // cm
}

export interface ShippingOption {
  id: number;
  name: string;
  company: {
    id: number;
    name: string;
    picture: string | null;
  };
  price: string;
  custom_price: string;
  discount: string;
  delivery_time: number;
  delivery_range: { min: number; max: number };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Remove não-dígitos e valida 8 dígitos. Retorna null se inválido. */
export function sanitizeCEP(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 8 ? digits : null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Solicita cotações via Supabase Edge Function.
 * O token do Melhor Envio fica nos secrets da Edge Function — nunca no cliente.
 *
 * @param fromPostalCode  CEP do vendedor (origem)
 * @param toPostalCode    CEP do comprador (destino)
 * @param pkg             Dimensões do pacote
 */
export async function fetchShippingQuotes(
  fromPostalCode: string,
  toPostalCode: string,
  pkg: ShippingPackage
): Promise<ShippingOption[]> {
  if (!sanitizeCEP(fromPostalCode)) throw new Error("CEP do vendedor inválido");
  if (!sanitizeCEP(toPostalCode))   throw new Error("CEP de destino inválido");

  const { data, error } = await supabase.functions.invoke<{
    quotes?: ShippingOption[];
    error?: string;
  }>("shipping-quote", {
    body: {
      fromPostalCode: fromPostalCode.replace(/\D/g, ""),
      toPostalCode:   toPostalCode.replace(/\D/g, ""),
      package: pkg,
    },
  });

  if (error)        throw new Error(error.message ?? "Erro ao calcular frete");
  if (data?.error)  throw new Error(data.error);

  const quotes = data?.quotes;
  if (!Array.isArray(quotes) || quotes.length === 0) {
    throw new Error("Nenhuma opção de frete disponível para este CEP");
  }

  return quotes;
}
