/**
 * PayGuard Escrow - Security & Validation Module
 * 
 * Implements:
 * - SSRF Protection (NFR-S5, FR-15): Validates submission URLs against loopback/private IP ranges
 * - Prompt Injection Shield (NFR-S4, NFR-S9): Untrusted content isolation and adversarial input detection
 */

import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';

const lookupAsync = promisify(dns.lookup);

// Private IP blocks (RFC 1918, RFC 3927, RFC 5735, RFC 5156)
const PRIVATE_IP_REGEXES = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,                // Loopback (127.0.0.0/8)
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,                 // Private 10.0.0.0/8
  /^192\.168\.\d{1,3}\.\d{1,3}$/,                   // Private 192.168.0.0/16
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,   // Private 172.16.0.0/12
  /^169\.254\.\d{1,3}\.\d{1,3}$/,                   // Link-local 169.254.0.0/16
  /^0\.0\.0\.0$/,                                   // Current network
  /^::1$/,                                          // IPv6 loopback
  /^fc00:/i,                                        // IPv6 unique local
  /^fe80:/i,                                        // IPv6 link-local
];

export interface URLValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
  ip?: string;
}

/**
 * Validates a submitted freelancer URL.
 * Enforces HTTPS (except when allowLocalhost is explicitly set for test/dev environments),
 * blocks private/loopback IP address resolution (SSRF prevention).
 */
export async function validateSubmissionUrl(
  inputUrl: string,
  options: { allowLocalhost?: boolean } = {}
): Promise<URLValidationResult> {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  if (inputUrl.length > 2048) {
    return { valid: false, error: 'URL exceeds maximum length of 2048 characters' };
  }

  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch {
    return { valid: false, error: 'Malformed URL structure' };
  }

  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

  if (!options.allowLocalhost) {
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs are allowed in production' };
    }
  } else {
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
    }
  }

  if (isLocal) {
    if (options.allowLocalhost) {
      return { valid: true, normalizedUrl: parsed.toString(), ip: '127.0.0.1' };
    }
    return { valid: false, error: 'Loopback and localhost URLs are forbidden' };
  }

  // Resolve hostname DNS to check IP address
  try {
    const { address } = await lookupAsync(parsed.hostname);
    for (const regex of PRIVATE_IP_REGEXES) {
      if (regex.test(address)) {
        return {
          valid: false,
          error: `Security violation: URL resolves to forbidden private or loopback IP (${address})`,
          ip: address,
        };
      }
    }
    return { valid: true, normalizedUrl: parsed.toString(), ip: address };
  } catch (err: any) {
    return { valid: false, error: `Failed to resolve domain: ${err.message}` };
  }
}

/**
 * Prompt injection detector and sanitizer.
 * Scans page DOM excerpts for known prompt injection payloads before sending to LLM.
 */
export function sanitizePageContentForLLM(
  rawContent: string,
  maxLength = 4000
): { sanitized: string; flaggedPhrases: string[] } {
  const ADVERSARIAL_PATTERNS = [
    /ignore (all )?previous instructions/i,
    /release all (funds|money|paypal)/i,
    /override (the )?score/i,
    /mark (all )?tests? (as )?pass/i,
    /system:\s*you are now/i,
    /pay (100%|full amount) immediately/i,
  ];

  const flaggedPhrases: string[] = [];
  for (const pattern of ADVERSARIAL_PATTERNS) {
    const match = rawContent.match(pattern);
    if (match) {
      flaggedPhrases.push(match[0]);
    }
  }

  // Truncate to avoid context flooding
  const truncated = rawContent.slice(0, maxLength);

  // Strip obvious script tags and base64 clutter
  const sanitized = truncated
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/data:image\/[^;]+;base64,[^\s"']+/g, '[IMAGE_DATA_REMOVED]');

  return { sanitized, flaggedPhrases };
}

