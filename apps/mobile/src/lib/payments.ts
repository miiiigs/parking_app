import { getResolvedPayMongoConfig, getPayMongoConfigStatus } from './paymongoConfig';
import { getCurrentMobileSession } from './supabaseClient';
import { getResolvedSupabaseConfig } from './supabaseConfig';

export type PayMongoCardDetails = {
  cardNumber: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  cardholderName?: string;
};

export type PayMongoMethodType = 'card' | 'gcash' | 'paymaya' | 'qrph';

type FunctionFailure = {
  error: string;
};

type PayMongoApiErrorBody = {
  errors?: Array<{
    detail?: string;
    code?: string;
  }>;
};

type CreateIntentResponse = {
  paymentIntentId: string;
  clientKey: string;
  paymentIntentStatus: string;
  paymentStatus: 'pending' | 'paid';
};

type SyncIntentResponse = {
  paymentIntentStatus: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  nextActionRedirectUrl: string | null;
  qrImageUrl: string | null;
  errorMessage: string | null;
};

type PaymentMethodResponse = {
  data: {
    id: string;
  };
};

type PaymentIntentAttachResponse = {
  data: {
    id: string;
    attributes: {
      status: string;
      next_action?: {
        redirect?: {
          url?: string;
        };
        code?: {
          image_url?: string;
        };
      };
      last_payment_error?: {
        failed_message?: string;
        message?: string;
      };
    };
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getFunctionError(body: unknown) {
  return isRecord(body) && typeof body.error === 'string' ? body.error : null;
}

function getPayMongoApiError(body: unknown) {
  if (!isRecord(body) || !Array.isArray(body.errors) || !isRecord(body.errors[0])) {
    return null;
  }

  const firstError = body.errors[0];
  return typeof firstError.detail === 'string' ? firstError.detail : null;
}

function encodeBase64(value: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let index = 0;

  while (index < value.length) {
    const chr1 = value.charCodeAt(index++);
    const chr2 = value.charCodeAt(index++);
    const chr3 = value.charCodeAt(index++);

    const enc1 = chr1 >> 2;
    const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    let enc4 = chr3 & 63;

    if (Number.isNaN(chr2)) {
      enc3 = 64;
      enc4 = 64;
    } else if (Number.isNaN(chr3)) {
      enc4 = 64;
    }

    output += chars.charAt(enc1);
    output += chars.charAt(enc2);
    output += chars.charAt(enc3);
    output += chars.charAt(enc4);
  }

  return output;
}

function buildBasicAuthHeader(key: string) {
  return `Basic ${encodeBase64(`${key}:`)}`;
}

function getPayMongoPublicKey() {
  const configStatus = getPayMongoConfigStatus();

  if (!configStatus.isConfigured) {
    throw new Error('PayMongo is not configured. Set EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY.');
  }

  return getResolvedPayMongoConfig().payMongoPublicKey as string;
}

async function invokePayMongoFunction<T>(payload: Record<string, unknown>) {
  const session = await getCurrentMobileSession();
  const supabaseUrl = getResolvedSupabaseConfig().supabaseUrl;

  if (!supabaseUrl) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  if (!session?.access_token) {
    throw new Error('Sign in is required before you can process a payment.');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/paymongo-checkout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as T | FunctionFailure | null;
  const functionError = getFunctionError(body);

  if (!response.ok) {
    throw new Error(functionError ?? 'Unable to reach the PayMongo service.');
  }

  if (functionError) {
    throw new Error(functionError);
  }

  if (!body) {
    throw new Error('The PayMongo service returned an empty response.');
  }

  return body as T;
}

async function payMongoPublicRequest<T>(payload: Record<string, unknown>) {
  const publicKey = getPayMongoPublicKey();
  const response = await fetch('https://api.paymongo.com/v1/payment_methods', {
    method: 'POST',
    headers: {
      Authorization: buildBasicAuthHeader(publicKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as T | FunctionFailure | PayMongoApiErrorBody | null;
  const functionError = getFunctionError(body);
  const apiError = getPayMongoApiError(body);

  if (!response.ok) {
    throw new Error(functionError ?? apiError ?? 'PayMongo payment method creation failed.');
  }

  if (functionError) {
    throw new Error(functionError);
  }

  if (apiError) {
    throw new Error(apiError);
  }

  if (!body) {
    throw new Error('PayMongo returned an empty payment method response.');
  }

  return body as T;
}

async function attachPayMongoPaymentMethod<T>({
  paymentIntentId,
  paymentMethodId,
  clientKey,
  returnUrl,
}: {
  paymentIntentId: string;
  paymentMethodId: string;
  clientKey: string;
  returnUrl?: string;
}) {
  const publicKey = getPayMongoPublicKey();
  const response = await fetch(`https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/attach`, {
    method: 'POST',
    headers: {
      Authorization: buildBasicAuthHeader(publicKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          payment_method: paymentMethodId,
          client_key: clientKey,
          ...(returnUrl ? { return_url: returnUrl } : {}),
        },
      },
    }),
  });

  const body = (await response.json().catch(() => null)) as T | FunctionFailure | PayMongoApiErrorBody | null;
  const functionError = getFunctionError(body);
  const apiError = getPayMongoApiError(body);

  if (!response.ok) {
    throw new Error(functionError ?? apiError ?? 'PayMongo attach failed.');
  }

  if (functionError) {
    throw new Error(functionError);
  }

  if (apiError) {
    throw new Error(apiError);
  }

  if (!body) {
    throw new Error('PayMongo returned an empty attach response.');
  }

  return body as T;
}

export function mapWalletMethodToPayMongoType(methodId: string): PayMongoMethodType {
  const normalizedMethodId = methodId.trim().toLowerCase();

  if (normalizedMethodId.includes('maya')) {
    return 'paymaya';
  }

  if (normalizedMethodId.includes('qrph') || normalizedMethodId.includes('qr-ph')) {
    return 'qrph';
  }

  return 'gcash';
}

export async function createPayMongoPaymentIntent({
  reservationId,
  paymentMethodType,
}: {
  reservationId: string;
  paymentMethodType: PayMongoMethodType;
}) {
  return invokePayMongoFunction<CreateIntentResponse>({
    action: 'create_payment_intent',
    reservationId,
    paymentMethodType,
  });
}

export async function syncPayMongoPaymentIntent({
  reservationId,
  paymentIntentId,
}: {
  reservationId: string;
  paymentIntentId: string;
}) {
  return invokePayMongoFunction<SyncIntentResponse>({
    action: 'sync_payment_intent',
    reservationId,
    paymentIntentId,
  });
}

export async function createPayMongoCardPaymentMethod(details: PayMongoCardDetails) {
  const session = await getCurrentMobileSession();
  const user = session?.user ?? null;
  const normalizedEmail = user?.email?.trim().toLowerCase() || `paymongo-test-${user?.id ?? 'guest'}@example.com`;
  const normalizedPhone = user?.phone?.trim() || '09171234567';
  const fallbackName =
    details.cardholderName?.trim()
    || (typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name.trim() : '')
    || (typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '')
    || 'ParkEasy Customer';

  const response = await payMongoPublicRequest<PaymentMethodResponse>({
    data: {
      attributes: {
        type: 'card',
        details: {
          card_number: details.cardNumber,
          exp_month: details.expMonth,
          exp_year: details.expYear,
          cvc: details.cvc,
        },
        ...(details.cardholderName
          ? {
              billing: {
                name: fallbackName,
                email: normalizedEmail,
                phone: normalizedPhone,
                address: {
                  line1: '123 Main Street',
                  city: 'Manila',
                  state: 'Metro Manila',
                  postal_code: '1000',
                  country: 'PH',
                },
              },
            }
          : {
              billing: {
                name: fallbackName,
                email: normalizedEmail,
                phone: normalizedPhone,
                address: {
                  line1: '123 Main Street',
                  city: 'Manila',
                  state: 'Metro Manila',
                  postal_code: '1000',
                  country: 'PH',
                },
              },
            }),
      },
    },
  });

  return response.data.id;
}

export async function createPayMongoSimplePaymentMethod(type: 'gcash' | 'paymaya' | 'qrph') {
  const response = await payMongoPublicRequest<PaymentMethodResponse>({
    data: {
      attributes: {
        type,
      },
    },
  });

  return response.data.id;
}

export async function attachPayMongoPaymentMethodToIntent({
  paymentIntentId,
  paymentMethodId,
  clientKey,
  returnUrl,
}: {
  paymentIntentId: string;
  paymentMethodId: string;
  clientKey: string;
  returnUrl?: string;
}) {
  const response = await attachPayMongoPaymentMethod<PaymentIntentAttachResponse>({
    paymentIntentId,
    paymentMethodId,
    clientKey,
    returnUrl,
  });

  const attributes = response.data.attributes;
  const nextAction = isRecord(attributes.next_action) ? attributes.next_action : null;
  const redirect = nextAction && isRecord(nextAction.redirect) ? nextAction.redirect : null;
  const code = nextAction && isRecord(nextAction.code) ? nextAction.code : null;
  const lastPaymentError = isRecord(attributes.last_payment_error) ? attributes.last_payment_error : null;

  return {
    paymentIntentId: response.data.id,
    paymentIntentStatus: attributes.status,
    nextActionRedirectUrl: typeof redirect?.url === 'string' ? redirect.url : null,
    qrImageUrl: typeof code?.image_url === 'string' ? code.image_url : null,
    errorMessage:
      typeof lastPaymentError?.failed_message === 'string'
        ? lastPaymentError.failed_message
        : typeof lastPaymentError?.message === 'string'
          ? lastPaymentError.message
          : null,
  };
}
