import { NextResponse } from 'next/server';

const manifest = {
  name: 'Eleva',
  short_name: 'Eleva',
  description: 'AI Career Workspace',
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#6366F1',
  icons: [
    { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    { src: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    { src: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    { src: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
    { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
  ],
};

export async function GET() {
  return NextResponse.json(manifest, {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
}
