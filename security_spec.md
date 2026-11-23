# Security Specification — VIVERDE STUDIO Multi-Tenant Firestore Rules

## 1. Data Invariants
1. Every business entity (`products`, `clients`, `projects`, `quotes`, `floralDesigns`, `members`) belongs strictly to a single `companyId`.
2. Users of Company A can NEVER read, list, create, update, or delete any document inside Company B.
3. Client PII (`clients/{clientId}`, `users/{userId}`) is only readable by verified members of that company (for `clients`) or the owner user (for `users`).
4. A user cannot elevate their own role (`company_admin`, `super_admin`) in `companies/{companyId}/members/{uid}`.
5. `ownerUid`, `companyId`, and `createdAt` are immutable after document creation.
6. Terminal quote status (`aceptado`, `rechazado`) and terminal project status (`completado`) are locked against non-admin mutations.
7. Shared public previews (`/sharedProjects/{shareToken}`) expose zero PII (no client email, phone, or address) and are strictly read-only (`get` only, no `list`).

## 2. Dirty Dozen Attack Payloads (Must Return PERMISSION_DENIED)
1. Cross-tenant product read: User in Company A reads `/companies/company-b/products/prod-1`.
2. Cross-tenant client PII list: User in Company A lists `/companies/company-b/clients`.
3. Self-privilege escalation on create: User registers `/companies/comp-a/members/{uid}` with `role: "company_admin"` when not company owner.
4. Self-privilege escalation on update: Employee updates their own `role` field to `"company_admin"`.
5. Unverified email write: Authenticated user with `email_verified: false` attempts to create a project.
6. Shadow field injection: Client sends `{ ...validProduct, isVerified: true, ghostField: "x" }`.
7. Oversized ID poisoning: Client writes `/companies/comp-a/projects/{1500-char-id}`.
8. Owner spoofing: User creates project with `ownerUid: "someone-else-uid"`.
9. Timestamp tampering: Client submits fake `createdAt` not matching `request.time`.
10. Terminal state bypass: Employee updates a quote whose status is already `"aceptado"`.
11. Unscoped list scraping: User tries `collectionGroup` or unscoped `list` on `/users`.
12. Shared project enumeration: Anonymous user tries `list` on `/sharedProjects` instead of `get` with exact token.
