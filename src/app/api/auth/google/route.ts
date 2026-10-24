import { NextResponse } from 'next/server';
import { verifyFirebaseIdToken, extractBearerToken } from '@/lib/serverAuth';
import { getAccountAdminStoreAdapter } from '@/lib/serverAccountAdminAdapter';
import { recordAuditEventAsync } from '@/lib/serverAuditStore';
import { getTrustedClientIp, checkRateLimitAsync } from '@/lib/serverRoomStore';
import type { ServerUserRecord } from '@/lib/serverUserStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/google
 * Authoritatively verifies a Google Firebase ID token and registers/synchronizes
 * the Google user in the server account store so they are fully tracked and visible
 * in the admin panel and across all system operations.
 */
export async function POST(request: Request) {
  const clientIp = getTrustedClientIp(request);
  const rateKey = `google_auth_${clientIp}`;

  const rateCheck = await checkRateLimitAsync(rateKey);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many authentication requests. Please try again shortly.' },
      { status: 429 }
    );
  }

  try {
    let token = extractBearerToken(request);
    let bodyPayload: { idToken?: string; displayName?: string; photoURL?: string } = {};

    try {
      bodyPayload = await request.json();
    } catch {
      // Body may be empty if token is strictly in Authorization header
    }

    if (!token && bodyPayload.idToken) {
      token = bodyPayload.idToken.trim();
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required. No Google ID token provided.' },
        { status: 401 }
      );
    }

    const verifyResult = await verifyFirebaseIdToken(token);
    if (!verifyResult.success || !verifyResult.decoded) {
      return NextResponse.json(
        { error: verifyResult.error || 'Invalid Google authentication token.' },
        { status: 401 }
      );
    }

    const decoded = verifyResult.decoded;
    const uid = decoded.uid;
    const email = (decoded.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: 'Google account must have an associated email address.' },
        { status: 400 }
      );
    }

    const adapter = getAccountAdminStoreAdapter();
    const now = Date.now();

    // Check if user already exists by email or UID
    let existingUser = await Promise.resolve(adapter.getUserByEmail(email));
    if (!existingUser) {
      existingUser = await Promise.resolve(adapter.getUserById(uid));
    }

    const resolvedDisplayName =
      bodyPayload.displayName ||
      (decoded as any).name ||
      (decoded as any).displayName ||
      email.split('@')[0] ||
      'Google User';

    const resolvedAvatarUrl =
      bodyPayload.photoURL ||
      (decoded as any).picture ||
      undefined;

    let userRecord: ServerUserRecord;

    if (existingUser) {
      // Update existing user with Google sync & new login timestamp
      userRecord = {
        ...existingUser,
        lastLoginAt: now,
        isVerified: true, // Google accounts are verified
        verifiedAt: existingUser.verifiedAt || now,
        displayName: existingUser.displayName || resolvedDisplayName,
        avatarUrl: existingUser.avatarUrl || resolvedAvatarUrl,
        provider: 'google.com'
      };
      await Promise.resolve(adapter.saveUser(userRecord));
    } else {
      // Register new Google account
      userRecord = {
        id: uid,
        email,
        displayName: resolvedDisplayName,
        avatarSeed: email || uid,
        avatarUrl: resolvedAvatarUrl,
        isVerified: true,
        createdAt: now,
        verifiedAt: now,
        lastLoginAt: now,
        provider: 'google.com'
      };
      await Promise.resolve(adapter.saveUser(userRecord));
    }

    // Record audit event for compliance and admin oversight
    await recordAuditEventAsync({
      adminUser: 'system',
      action: existingUser ? 'USER_LOGIN_GOOGLE' : 'USER_REGISTER_GOOGLE',
      target: userRecord.id,
      status: 'SUCCESS',
      ip: clientIp,
      metadata: {
        email,
        provider: 'google.com',
        authMethod: 'firebase_google_oauth',
        userAgent: request.headers.get('user-agent') || 'Unknown'
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        displayName: userRecord.displayName,
        avatarSeed: userRecord.avatarSeed,
        avatarUrl: userRecord.avatarUrl,
        isVerified: userRecord.isVerified,
        createdAt: userRecord.createdAt,
        lastLoginAt: userRecord.lastLoginAt,
        provider: 'google.com'
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Google authentication sync failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
