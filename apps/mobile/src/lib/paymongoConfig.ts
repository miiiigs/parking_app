export type PayMongoConfigStatus = {
  isConfigured: boolean;
  missingKeys: string[];
};

type PayMongoEnv = Record<string, string | undefined>;

function normalizeEnvValue(value: string | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

const expoPublicPayMongoPublicKey = normalizeEnvValue(process.env.EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY);

export function getResolvedPayMongoConfig(env?: PayMongoEnv) {
  return {
    payMongoPublicKey: normalizeEnvValue(env?.EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY) ?? expoPublicPayMongoPublicKey,
  };
}

export function getPayMongoConfigStatus(env?: PayMongoEnv): PayMongoConfigStatus {
  const { payMongoPublicKey } = getResolvedPayMongoConfig(env);
  const missingKeys: string[] = [];

  if (!payMongoPublicKey) {
    missingKeys.push('EXPO_PUBLIC_PAYMONGO_PUBLIC_KEY');
  }

  return {
    isConfigured: missingKeys.length === 0,
    missingKeys,
  };
}
