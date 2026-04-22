// Mercado Pago integration — placeholders ready for SDK/Edge Function wiring.
// Card data is NEVER stored in our database.
// All tokenization goes directly to MP servers; we only receive and store a token.

export interface MPCardData {
  cardholderName: string;
  cardNumber: string;   // digits only, no spaces
  expiryMonth: string;  // "MM" zero-padded
  expiryYear: string;   // "YY"
  cvv: string;
}

export interface MPCardToken {
  token: string;           // store this — never the raw card data
  lastFourDigits: string;
  firstSixDigits: string;
  cardholderName: string;
  expirationMonth: number;
  expirationYear: number;
}

export interface MPPreference {
  preferenceId: string;
  initPoint: string;      // Checkout Pro URL — open in browser or WebView
  pixQrCode?: string;     // Base64 QR image for PIX
  pixCopyPaste?: string;  // "copia e cola" string
  pixExpiresAt?: string;  // ISO date
}

export interface MPOrderItem {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
  type: "physical" | "digital";
}

export interface CreatePreferenceInput {
  orderId: string;
  items: MPOrderItem[];
  shippingCost: number;
  buyerEmail: string;
  paymentMethod: "credit_card" | "pix";
  cardToken?: string;   // from tokenizeCard — only if credit_card
  shippingAddress?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

/**
 * Tokenizes card data via Mercado Pago SDK.
 * Card fields are sent directly to MP servers — our backend never sees raw card data.
 *
 * TODO: integrate @mercadopago/sdk-react-native or handle via secure WebView.
 *       MP public key goes in app config (not secret), tokenization URL:
 *       POST https://api.mercadopago.com/v1/card_tokens?public_key=APP_USR-...
 */
export async function tokenizeCard(_cardData: MPCardData): Promise<MPCardToken> {
  throw new Error("TODO: MP card tokenization — pending SDK integration");
}

/**
 * Creates a Mercado Pago payment preference via Supabase Edge Function.
 * The MP access token (secret) lives in Supabase secrets, never in the app.
 *
 * TODO: deploy Supabase Edge Function `mp-create-preference` that:
 *   1. Receives { orderId, items, shippingCost, buyerEmail, paymentMethod, ... }
 *   2. Calls POST https://api.mercadopago.com/checkout/preferences with MP token
 *   3. Returns { preferenceId, initPoint } (or pixQrCode for PIX)
 *   4. Updates order status in DB to "pending_payment"
 *
 * Webhook: configure MP to POST to your Supabase Edge Function `mp-webhook`
 *   on payment status change → update order status in DB → notify app via
 *   Supabase Realtime or push notification.
 */
export async function createMPPreference(
  _input: CreatePreferenceInput
): Promise<MPPreference> {
  throw new Error("TODO: MP preference — pending Edge Function `mp-create-preference`");
}
