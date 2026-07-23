import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new NextResponse('ok', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}
