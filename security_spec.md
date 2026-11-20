# Security Specification — rekapinJx Firestore

## 1. Data Invariants
1. **Strict Ownership & PII Isolation**: `/users/{userId}` stores PII (`email`, `displayName`, `photoURL`) and preferences (`darkMode`, `buttonStyle`). Only the verified authenticated owner (`request.auth.uid == userId && request.auth.token.email_verified == true`) may read (`get`) or write their own document. `list` on `/users` is strictly denied (`false`) to prevent user enumeration.
2. **Master Gate on Subcollections**: `/users/{userId}/abc_workspaces/{workspaceId}` and `/users/{userId}/uraian_workspaces/{workspaceId}` require that the parent `/users/{userId}` document exists (`exists(...)`) and belongs to `request.auth.uid`, and that `incoming().ownerId == userId == request.auth.uid`.
3. **Immutable Ownership & Timestamps**: `uid` / `ownerId` and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time` on creation, and `updatedAt` must equal `request.time` on update.
4. **Strict Key & Boundary Limits**: Every document write validates exact allowed/required keys (`hasAll` + `hasOnly`), type safety, numeric bounds (`questionCount` 1..200, `itemCount` 1..100, `rows.size() <= 500`), string length caps, and regex ID guards (`^[a-zA-Z0-9_\\-]+$`).
5. **Action-Based Updates**: Every `allow update` begins with `isValid[Entity](incoming())` and uses `incoming().diff(existing()).affectedKeys().hasOnly(...)` per allowed action.
6. **No Client Query Delegation**: `list` is disabled (`false`) on all collections because clients only address known fixed document IDs (`users/{uid}`, `.../default`).

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Read/Write**: `uid = null` reading `/users/alice` or writing `/users/alice/abc_workspaces/default` -> `PERMISSION_DENIED`.
2. **Cross-Tenant Read (PII Leak)**: `bob` calling `get(/users/alice)` -> `PERMISSION_DENIED`.
3. **User Enumeration (List)**: `bob` calling `list(/users)` -> `PERMISSION_DENIED`.
4. **Unverified Email Write**: `alice` with `email_verified: false` creating `/users/alice` -> `PERMISSION_DENIED`.
5. **Identity Spoofing on Create**: `bob` creating `/users/bob/abc_workspaces/default` with `ownerId: "alice"` -> `PERMISSION_DENIED`.
6. **Shadow / Ghost Field Injection**: `alice` writing `/users/alice` with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
7. **Orphaned Workspace Write**: `alice` writing `/users/alice/abc_workspaces/default` when `/users/alice` does not exist -> `PERMISSION_DENIED`.
8. **ID Poisoning**: `alice` writing `/users/alice/abc_workspaces/invalid$id_with_1500_chars...` -> `PERMISSION_DENIED`.
9. **Immutable Field Tampering**: `alice` updating `/users/alice/abc_workspaces/default` and changing `createdAt` or `ownerId` -> `PERMISSION_DENIED`.
10. **Client Timestamp Spoofing**: `alice` sending `updatedAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> `PERMISSION_DENIED`.
11. **Value Poisoning / Bounds Overflow**: `alice` updating `questionCount: 9999` or `examTitle` with 10KB string -> `PERMISSION_DENIED`.
12. **Array Exhaustion (Denial of Wallet)**: `alice` sending `rows` with 501+ entries or `answerKey` with 201+ entries -> `PERMISSION_DENIED`.
