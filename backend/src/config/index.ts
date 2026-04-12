const missingKeys: string[] = [];
if (!process.env.JWT_SECRET) missingKeys.push('JWT_SECRET');
if (missingKeys.length > 0) {
  throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '24h') as '24h',
  databaseUrl: process.env.DATABASE_URL as string,
  googleMapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
};
