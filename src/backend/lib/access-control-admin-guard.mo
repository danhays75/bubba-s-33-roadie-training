import Principal "mo:core/Principal";
import Map "mo:core/Map";
import AccessControl "mo:caffeineai-authorization/access-control";
import Foundation "./foundation";

module {
  // Corrected access-control initialization that repairs the corrupted
  // userRoles B-tree left by the frozen migration 20260703_000001.
  //
  // Background: the frozen migration 20260703_000001.mo (lines 140-142)
  // calls Map.add while iterating userRoles with forEach, corrupting the
  // B-tree. After that corruption, AccessControl.initialize's
  // `state.userRoles.get(caller)` returns null for an admin caller even
  // though an #admin entry exists. Because adminAssigned is already true,
  // the original initialize then assigns #user — silently revoking admin.
  // The createPosition admin guard (foundation-api.mo:129-134) checks
  // AccessControl.isAdmin, which reads #user, so it rejects the admin.
  //
  // This helper replaces AccessControl.initialize for the sign-in path.
  // It preserves every existing UserRole (never downgrades #admin), and
  // when a caller has NO userRoles entry but their stored profile.role ==
  // #admin, it re-grants #admin — repairing the corrupted/missing grant.
  // First-user-becomes-admin is preserved for genuinely new callers
  // (adminAssigned is false AND no profile exists).
  //
  // `profiles` is the foundation UserProfile map, used to detect admin
  // profiles whose userRoles grant was lost to the B-tree corruption.

  public func initialize(
    state : AccessControl.AccessControlState,
    profiles : Map.Map<Principal, Foundation.UserProfile>,
    caller : Principal,
  ) {
    if (caller.isAnonymous()) { return };
    switch (state.userRoles.get(caller)) {
      // Existing entry — preserve it. Never downgrade an #admin grant.
      case (?_) {};
      // No userRoles entry. Either the B-tree corruption hid an existing
      // #admin grant, or this is a genuinely new caller.
      case (null) {
        switch (profiles.get(caller)) {
          // The caller has a stored profile. If its app-domain role is
          // #admin, the userRoles grant was lost to the corruption —
          // re-grant #admin to repair it. Otherwise assign #user.
          case (?profile) {
            if (profile.role == #admin) {
              state.userRoles.add(caller, #admin);
            } else {
              state.userRoles.add(caller, #user);
            };
          };
          // No stored profile — genuinely new caller. Apply the original
          // first-user-becomes-admin logic: the very first user becomes
          // admin, every later user becomes #user.
          case null {
            if (not state.adminAssigned) {
              state.userRoles.add(caller, #admin);
              state.adminAssigned := true;
            } else {
              state.userRoles.add(caller, #user);
            };
          };
        };
      };
    };
  };
};
