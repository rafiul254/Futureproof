import { NextResponse } from 'next/server';

import { getDataProvider } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

/** GET /api/occupations — the target-role dropdown options. */
export async function GET() {
  const provider = await getDataProvider();
  const occupations = await provider.listOccupations();

  return NextResponse.json({
    occupations: occupations
      .map((o) => ({ id: o.id, title: o.title, titleBn: o.titleBn }))
      .sort((a, b) => a.title.localeCompare(b.title)),
  });
}
