import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path } = await params;
    const pathname = path.join('/');

    const blob = await get(pathname, { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!blob || blob.statusCode !== 200) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return new NextResponse(blob.stream as any, {
        headers: {
            'Content-Type': blob.blob.contentType || 'application/octet-stream',
            'Cache-Control': 'private, max-age=3600',
        },
    });
}
