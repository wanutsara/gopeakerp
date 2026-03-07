import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Enterprise-Grade PDPA Encryption Key (AES-256)
 * Requires exactly 32 bytes. Derives deterministically from NEXTAUTH_SECRET out-of-the-box
 * to ensure seamless deployments without requiring clients to inject new ENV variables immediately.
 */
const ENCRYPTION_KEY = process.env.PDPA_ENCRYPTION_KEY
    ? Buffer.from(process.env.PDPA_ENCRYPTION_KEY, 'hex')
    : crypto.scryptSync(process.env.NEXTAUTH_SECRET || 'GOPEAK_ERP_ENTERPRISE_FALLBACK_ROOT_KEY_999', 'gopeak_salt', 32);

/**
 * Encrypts sensitive PII (e.g. Thai National ID, Bank Accounts) using AES-256-GCM
 * @param text The plaintext string to encrypt
 * @returns format: `iv:authTag:encryptedText`
 */
export function encryptPII(text: string | null | undefined): string | null {
    if (!text) return null;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        // Pack the IV and Auth Tag with the payload for GCM decryption
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        console.error('CRITICAL: PDPA Encryption Engine Failed:', error);
        throw new Error('Encryption Service Unavailable');
    }
}

/**
 * Decrypts sensitive PII stored in the database
 * @param hash The packed AES-256-GCM string (`iv:authTag:encryptedText`)
 * @returns The original plaintext string
 */
export function decryptPII(hash: string | null | undefined): string | null {
    if (!hash) return null;
    try {
        const parts = hash.split(':');
        // If it's not in the 3-part format, it might be legacy unencrypted data or malformed.
        if (parts.length !== 3) return hash;

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('CRITICAL: PDPA Decryption Engine Failed:', error);
        // Returns asterisks to prevent application crashing while maintaining visual obfuscation
        return '******** (DECRYPTION_ERROR)';
    }
}
