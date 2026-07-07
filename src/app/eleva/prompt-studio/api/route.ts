import { NextRequest, NextResponse } from 'next/server';
import { getPromptVersions, getPromptAnalytics } from '../_lib/data';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const promptId = searchParams.get('promptId');
  if (!promptId) return NextResponse.json({ error: 'Missing promptId' }, { status: 400 });

  try {
    if (action === 'versions') {
      const versions = await getPromptVersions(promptId);
      return NextResponse.json({ versions });
    }
    if (action === 'analytics') {
      const analytics = await getPromptAnalytics(promptId);
      return NextResponse.json(analytics);
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
