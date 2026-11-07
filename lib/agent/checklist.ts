/**
 * PayGuard Escrow - Checklist Generator & Schema Validator
 * 
 * Enforces:
 * - 3 to 12 items
 * - Weights sum to exactly 100
 * - Console & network health item present with weight >= 10
 * - Each weight between 1 and 60
 * - Rule-based fallback if LLM is unavailable
 */

import { z } from 'zod';
import { ChecklistItem, TestType } from '../../types/index.js';

export const ChecklistItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(5).max(300),
  testType: z.enum([
    'functional',
    'responsive',
    'console_errors',
    'content_present',
    'navigation',
  ]),
  criteria: z.string().min(5).max(500),
  weight: z.number().int().min(1).max(60),
  critical: z.boolean().default(false),
});

export const ChecklistSchema = z.array(ChecklistItemSchema).min(3).max(12);

export interface ChecklistValidationResult {
  valid: boolean;
  errors: string[];
  totalWeight: number;
  hasConsoleHealth: boolean;
}

/**
 * Strictly validates a checklist against all SRS requirements (FR-6, FR-7)
 */
export function validateChecklist(items: ChecklistItem[]): ChecklistValidationResult {
  const errors: string[] = [];

  const parseResult = ChecklistSchema.safeParse(items);
  if (!parseResult.success) {
    errors.push(...parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`));
  }

  const totalWeight = Array.isArray(items) ? items.reduce((sum, item) => sum + (typeof item.weight === 'number' ? item.weight : 0), 0) : 0;
  if (totalWeight !== 100) {
    errors.push(`Checklist weights must sum to exactly 100, received sum: ${totalWeight}`);
  }

  const consoleHealthItem = Array.isArray(items) ? items.find((item) => item.testType === 'console_errors') : undefined;
  const hasConsoleHealth = !!consoleHealthItem && consoleHealthItem.weight >= 10;
  if (!consoleHealthItem) {
    errors.push('Checklist must include a console and network health item (testType: console_errors)');
  } else if (consoleHealthItem.weight < 10) {
    errors.push(`Console health item weight must be at least 10, received: ${consoleHealthItem.weight}`);
  }

  // Ensure unique IDs
  if (Array.isArray(items)) {
    const idSet = new Set<string>();
    for (const item of items) {
      if (item.id) {
        if (idSet.has(item.id)) {
          errors.push(`Duplicate item ID detected: ${item.id}`);
        }
        idSet.add(item.id);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    totalWeight,
    hasConsoleHealth,
  };
}

/**
 * System prompt designed for LLM Checklist Generation
 */
export const CHECKLIST_GENERATOR_SYSTEM_PROMPT = `
You are PayGuard's AI Escrow Contract Auditor.
Given the client's natural-language project requirements, produce an objective, machine-testable verification checklist in JSON format.

RULES:
1. Return between 3 and 12 checklist items.
2. Every item must have:
   - id: unique string (e.g., "chk-1", "chk-2")
   - description: clear, plain-English summary of what is verified
   - testType: one of ["functional", "responsive", "console_errors", "content_present", "navigation"]
   - criteria: precise pass/fail criteria executable in a browser
   - weight: integer between 1 and 60. The sum of all item weights MUST equal exactly 100.
   - critical: boolean (set to true ONLY for hard blockers, like "Site loads successfully over HTTP 200")
3. MANDATORY: You MUST include at least one item of testType "console_errors" with weight >= 10 to audit background JS/network errors.
4. Output ONLY valid JSON matching the schema, with no markdown fences or chit-chat.
`;

/**
 * Rule-based fallback checklist generator (when LLM API is unavailable or times out)
 */
export function generateFallbackChecklist(requirements: string): ChecklistItem[] {
  const reqLower = requirements.toLowerCase();
  const items: ChecklistItem[] = [
    {
      id: 'chk-load',
      description: 'Site loads over HTTPS without server or SSL error',
      testType: 'functional',
      criteria: 'Page returns HTTP status < 400 and renders DOM root element',
      weight: 25,
      critical: true, // If page doesn't even load, hard fail
    },
    {
      id: 'chk-console',
      description: 'Console and background network health audit',
      testType: 'console_errors',
      criteria: 'Zero unhandled uncaught JavaScript exceptions or 5xx API network errors on load',
      weight: 15,
      critical: false,
    },
    {
      id: 'chk-mobile',
      description: 'Mobile responsive layout scalability (390x844 viewport)',
      testType: 'responsive',
      criteria: 'No unintended horizontal scrollbar or element overflow beyond screen width (scrollWidth <= innerWidth)',
      weight: 20,
      critical: false,
    },
    {
      id: 'chk-nav',
      description: 'Navigation elements and page structure present',
      testType: 'navigation',
      criteria: 'Primary navigation links and essential headers are rendered and clickable',
      weight: 15,
      critical: false,
    },
  ];

  if (reqLower.includes('login') || reqLower.includes('auth') || reqLower.includes('sign in')) {
    items.push({
      id: 'chk-auth',
      description: 'Authentication and user login flow',
      testType: 'functional',
      criteria: 'Login form accepts valid test credentials and redirects user to dashboard without errors',
      weight: 25,
      critical: false,
    });
  } else {
    items.push({
      id: 'chk-content',
      description: 'Core functional content & interactive elements rendered',
      testType: 'content_present',
      criteria: 'Primary call-to-action buttons, text sections, and interactive widgets are visible',
      weight: 25,
      critical: false,
    });
  }

  // Validate to ensure weights sum to 100
  const validation = validateChecklist(items);
  if (!validation.valid) {
    throw new Error(`Fallback checklist failed internal validation: ${validation.errors.join(', ')}`);
  }

  return items;
}
