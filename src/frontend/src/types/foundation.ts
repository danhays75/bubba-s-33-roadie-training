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

/**
 * A labeled detail field on a Library item (e.g. SPIRIT: Bourbon).
 *
 * NOTE: the backend Candid field is `fieldLabel` (not `label`) because
 * `label` is a reserved Motoko keyword. The hook layer passes this through
 * unchanged.
 *
 * `id` is a FRONTEND-ONLY field — it is NOT part of the backend DetailField
 * record. It exists solely to give React a stable key for each row in the
 * DetailFieldEditor so inputs do not remount (and lose focus) on every
 * keystroke. The hook layer generates the id when reading from the backend
 * and strips it before persisting (createItem/updateItem map only
 * {fieldLabel, value}).
 */
export interface DetailField {
  id: string;
  fieldLabel: string;
  value: string;
}

/**
 * A Library category scoped to a single position (e.g. "Cocktails" under
 * Bartender). Categories are ordered per-parent (within their position) using
 * sortOrder.
 *
 * `id` and `positionId` are stringified bigints — set by the hook layer when
 * translating the Candid Category (which has `id: bigint`, `positionId: bigint`).
 * `sortOrder` is the number form of the bigint sortOrder.
 * `coverPhoto` is null when the backend omits the optional ?Text.
 */
export interface Category {
  id: string;
  positionId: string;
  name: string;
  coverPhoto: string | null;
  sortOrder: number;
}

/**
 * A Library item (recipe / training card) scoped to a single category.
 *
 * `id` and `categoryId` are stringified bigints — set by the hook layer when
 * translating the Candid LibraryItem (which has `id: bigint`,
 * `categoryId: bigint`). `sortOrder` is the number form of the bigint
 * sortOrder. `subtitle`, `photo`, and `notes` are null when the backend omits
 * the optional ?Text fields. `seasonal` is a plain boolean. `details` is an
 * array of DetailField (fieldLabel + value). `tags` is an array of strings.
 */
export interface LibraryItem {
  id: string;
  categoryId: string;
  title: string;
  subtitle: string | null;
  photo: string | null;
  details: DetailField[];
  notes: string | null;
  tags: string[];
  seasonal: boolean;
  sortOrder: number;
}
