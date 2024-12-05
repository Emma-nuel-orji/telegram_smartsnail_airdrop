"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const storage_1 = require("@/lib/storage");
const server_1 = require("next/server");
async function POST(request) {
    const { userId, referralId } = await request.json();
    if (!userId || !referralId) {
        return server_1.NextResponse.json({ error: 'Missing userId or referralId' }, { status: 400 });
    }
    (0, storage_1.saveReferral)(userId, referralId);
    return server_1.NextResponse.json({ success: true });
}
async function GET(request) {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
        return server_1.NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    const referrals = (0, storage_1.getReferrals)(userId);
    const referrer = (0, storage_1.getReferrer)(userId);
    return server_1.NextResponse.json({ referrals, referrer });
}
