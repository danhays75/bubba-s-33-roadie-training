// Foundation types mirroring the backend Candid bindings in backend.d.ts.
//
// The backend returns Principal and bigint; the frontend keeps ergonomic
// string versions (principal text, stringified bigint ids) for routing,
// display, and React keys. The hooks in src/hooks/* translate at the
// boundary: string -> Principal (Principal.fromText) and string -> bigint
// (BigInt(...)) on the way in, and the reverse on the way out.

export type Role = "trainee" | "trainer" | "manager" | "admin";

export type AssignmentStatus = "inTraining" | "certified";

/**
 * A user's profile. Created on first sign-in. The very first user to sign
 * up becomes Admin (handled backend-side); the rest default to trainee.
 *
 * `principal` is the stringified Principal (`user.id.toString()`) — set by
 * the hook layer when translating the Candid UserProfile (which has
 * `id: Principal`).
 */
export interface UserProfile {
  principal: string;
  name: string;
  storeLocation: string;
  role: Role;
}

/**
 * A training position (e.g. "Line Cook", "Server", "Bartender").
 * Positions are ordered per-parent (the position list) using sortOrder.
 *
 * `id` is the stringified bigint (`position.id.toString()`) — set by the
 * hook layer when translating the Candid Position (which has `id: bigint`).
 * `sortOrder` is the number form of the bigint sortOrder.
 */
export interface Position {
  id: string;
  name: string;
  description: string;
  coverPhoto: string | undefined;
  sortOrder: number;
}

/**
 * A user's assignment to a position, with a training status. Keyed by
 * (userId, positionId) — there is NO assignment id. Both keys are
 * stringified (Principal text and bigint-as-string) by the hook layer.
 */
export interface PositionAssignment {
  positionId: string;
  userPrincipal: string;
  status: AssignmentStatus;
}

/** Convenience: status badge label + tone for a position tile. */
export type StatusTone = "inTraining" | "certified" | "notStarted";
