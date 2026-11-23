/**
 * Phase 0 Security Test Specification for VIVERDE STUDIO Firestore Rules.
 * Verifies the "Dirty Dozen" adversarial payloads against multi-tenant boundaries.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'PERMISSION_DENIED';
  rationale: string;
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Cross-tenant product read',
    path: '/companies/company-b/products/olivo-1',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    rationale: 'User is only a member of company-a; isCompanyMember(company-b) evaluates false.',
  },
  {
    id: 2,
    name: 'Cross-tenant client PII list',
    path: '/companies/company-b/clients',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    rationale: 'hasListMembership() verifies request.auth.uid matches ownerUid or memberUids.',
  },
  {
    id: 3,
    name: 'Self-privilege escalation on create',
    path: '/companies/company-a/members/attacker-uid',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'Only existing company_admin or company owner can create admin member records.',
  },
  {
    id: 4,
    name: 'Self-privilege escalation on update',
    path: '/companies/company-a/members/employee-uid',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'Employee role cannot pass isCompanyAdmin(companyId).',
  },
  {
    id: 5,
    name: 'Unverified email write',
    path: '/companies/company-a/projects/proj-1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'isVerified() mandates request.auth.token.email_verified == true.',
  },
  {
    id: 6,
    name: 'Shadow field injection',
    path: '/companies/company-a/products/prod-1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'isValidProduct() enforces keys().hasOnly(...) and blocks unknown fields.',
  },
  {
    id: 7,
    name: 'Oversized ID poisoning',
    path: '/companies/company-a/projects/' + 'a'.repeat(1500),
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'isValidId() enforces id.size() <= 128 and strict alphanumeric regex.',
  },
  {
    id: 8,
    name: 'Owner spoofing',
    path: '/companies/company-a/projects/proj-spoof',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'Create rule mandates incoming().ownerUid == request.auth.uid.',
  },
  {
    id: 9,
    name: 'Timestamp tampering',
    path: '/companies/company-a/quotes/quote-1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'Create rule enforces createdAt == request.time and updatedAt == request.time.',
  },
  {
    id: 10,
    name: 'Terminal state bypass',
    path: '/companies/company-a/quotes/quote-accepted',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'Quotes in aceptado/rechazado state are locked unless user is company_admin.',
  },
  {
    id: 11,
    name: 'Unscoped user collection list',
    path: '/users',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    rationale: 'Users collection explicitly sets allow list: if false.',
  },
  {
    id: 12,
    name: 'Shared project enumeration',
    path: '/sharedProjects',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    rationale: 'sharedProjects explicitly sets allow list: if false; only direct token get allowed.',
  },
];
