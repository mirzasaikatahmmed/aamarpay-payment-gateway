import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  url: process.env.APP_URL || 'http://localhost:3000',
}));

export const databaseConfig = registerAs('database', () => ({
  url:
    process.env.DATABASE_URL ||
    'postgresql://localhost:5432/aamarpay_payment',
}));

export const aamarpayConfig = registerAs('aamarpay', () => ({
  baseUrl: process.env.AAMARPAY_BASE_URL,
  storeId: process.env.AAMARPAY_STORE_ID,
  signatureKey: process.env.AAMARPAY_SIGNATURE_KEY,
}));
