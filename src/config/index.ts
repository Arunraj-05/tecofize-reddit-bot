// Devvit runs in Reddit's infrastructure — process.env is populated at
// build time via Vite's define() or at runtime from the host environment.
// Values are injected through environment variables set before `npm run dev`.
export const config = {
  expressPublicUrl: (process.env['EXPRESS_PUBLIC_URL'] ?? '').replace(/\/$/, ''),
  devvitSecret: process.env['DEVVIT_SECRET'] ?? '',
} as const;
