/**
 * Configuração do Melhor Envio — lado cliente.
 *
 * O token e o CEP de origem ficam como secrets na Edge Function do Supabase.
 * Este arquivo NÃO deve conter o token — apenas dimensões padrão de pacote
 * usadas como fallback quando o produto não tem dimensões cadastradas.
 *
 * Para configurar os secrets no Supabase:
 *
 *   supabase secrets set MELHOR_ENVIO_TOKEN=<seu_token>
 *   supabase secrets set SELLER_POSTAL_CODE=01310100
 *   supabase secrets set MELHOR_ENVIO_SANDBOX=true   # remover em produção
 *
 * Para fazer o deploy da Edge Function:
 *   supabase functions deploy shipping-quote
 */

/** Dimensões padrão de pacote para produtos sem medidas cadastradas */
export const DEFAULT_PACKAGE = {
  weight: 0.5,  // kg
  height: 15,   // cm
  width:  15,   // cm
  length: 20,   // cm
} as const;
