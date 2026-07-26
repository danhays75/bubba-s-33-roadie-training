import Principal "mo:core/Principal";
import Map "mo:core/Map";
import List "mo:core/List";
import Set "mo:core/Set";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import EmailClient "mo:caffeineai-email/emailClient";
import VerifiedEmails "mo:caffeineai-email-verification/verifiedEmails";
import AccessControlAdminGuard "../lib/access-control-admin-guard";
import Foundation "../lib/foundation";
import Types "../types/foundation";

// Foundation domain API mixin. Exposes the public canister interface for
// user profiles, roles, positions, position assignments, profile photos,
// manual email verification, and Roadie approval/denial notification emails.
//
// State slices are injected from main.mo:
//   - accessControlState : the existing authorization state (admin/user/guest)
//   - profiles           : stable Map of user profiles keyed by Principal
//   - positions          : stable List of positions
//   - assignments        : stable List of position assignments
//   - nextPositionId     : stable counter record for new position ids
//   - verifiedEmails     : the email-verification extension's verified-email
//                          set (tracks which manually-typed addresses have
//                          been verified via a click-through challenge)
//
// Authorization: admin-only endpoints check AccessControl.isAdmin. The first
// user becomes admin via the access-control mixin's initialize path.
mixin (
  accessControlState : AccessControl.AccessControlState,
  profiles : Map.Map<Principal, Foundation.UserProfile>,
  positions : List.List<Foundation.Position>,
  assignments : List.List<Foundation.PositionAssignment>,
  nextPositionId : { var value : Nat },
  verifiedEmails : VerifiedEmails.State,
) {

  // --- Profile (self-service) ---

  public shared ({ caller }) func getMyProfile() : async ?Foundation.UserProfile {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    Foundation.getProfile(profiles, caller);
  };

  // Create the caller's own profile. The first user is auto-#approved admin
  // (Version 95 behavior preserved); subsequent users are #pending AND a
  // pending-approval notification email is sent to every admin who has an
  // email on file. The caller's email is captured from the access-control
  // sign-in callback (Foundation.setEmail) when available; createProfile
  // passes null here so the SSO-captured email (if any) is the source of
  // truth — createProfile only seeds email when the profile is brand new
  // and the callback hasn't run yet.
  public shared ({ caller }) func createMyProfile(name : Text, storeLocation : Text) : async Foundation.UserProfile {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    // Determine the role: the first user becomes #admin (Version 95), every
    // later user becomes #trainee (pending admin approval).
    let role : Types.Role = if (profiles.size() == 0) { #admin } else { #trainee };
    // createProfile sets approvalStatus (#approved for first user, #pending
    // otherwise) and seeds email = null (the SSO callback captures it).
    let profile = Foundation.createProfile(profiles, caller, name, storeLocation, role, null);
    // For non-first (pending) users, notify every admin who has an email on
    // file that a new Roadie is awaiting approval.
    if (profile.approvalStatus == #pending) {
      let adminEmails = collectAdminEmails();
      if (adminEmails.size() > 0) {
        let body = "A new Roadie has signed up and is awaiting approval.<br><br>"
          # "Name: " # profile.name # "<br>"
          # "Store Location: " # profile.storeLocation # "<br><br>"
          # "Please review and approve or reject this Roadie in the admin Users page.";
        let _ = await EmailClient.sendServiceEmail(
          "no-reply",
          adminEmails,
          "New Roadie pending approval: " # profile.name,
          body,
        );
      };
    };
    profile;
  };

  // Update the caller's own profile name and storeLocation. Does NOT mutate
  // email (use the email-verification flow) or photo (use setMyPhoto or
  // updateMyProfileWithPhoto). Preserves Version 95 approval behavior: the
  // first user is auto-#approved admin, subsequent users are #pending.
  public shared ({ caller }) func updateMyProfile(name : Text, storeLocation : Text) : async Foundation.UserProfile {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    switch (Foundation.updateProfile(profiles, caller, name, storeLocation)) {
      case (?profile) profile;
      case null Runtime.trap("Profile not found");
    };
  };

  // Update the caller's own profile name, storeLocation, AND photo. The
  // photo is an optional object-storage URL (the frontend uploads the photo
  // via the object-storage client and passes the resulting URL here).
  // Passing null clears the photo (frontend falls back to initials avatar).
  // Email is never mutated by this function.
  public shared ({ caller }) func updateMyProfileWithPhoto(name : Text, storeLocation : Text, photo : ?Text) : async Foundation.UserProfile {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    switch (Foundation.updateProfileWithPhoto(profiles, caller, name, storeLocation, photo)) {
      case (?profile) profile;
      case null Runtime.trap("Profile not found");
    };
  };

  // Set the caller's own profile photo URL. The frontend uploads the photo
  // via the object-storage client and persists the resulting URL here.
  // Optional — null clears the photo (frontend falls back to initials
  // avatar). Callable by the user themselves; admins never edit a Roadie's
  // photo.
  public shared ({ caller }) func setMyPhoto(photo : ?Text) : async Foundation.UserProfile {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    switch (Foundation.setPhoto(profiles, caller, photo)) {
      case (?profile) profile;
      case null Runtime.trap("Profile not found");
    };
  };

  // --- Manual email verification (self-service) ---
  // These endpoints let a user verify a manually-typed email address. The
  // flow is: initiateEmailVerification sends a click-through challenge email
  // to the supplied address; the user clicks the link, which lands on the
  // MixinEmailVerification callback (included in main.mo) and records the
  // address in verifiedEmails. The user then calls setEmailForUser, which
  // checks verifiedEmails.contains(newEmail) and, if verified, replaces the
  // stored email on the caller's profile. SSO-verified emails are captured
  // separately via the identity-attributes onVerified callback and are
  // NEVER re-verified through this flow. No admin label distinguishes
  // SSO-verified vs manually-verified emails — the new email simply
  // replaces the old one.

  // Initiate an email-verification challenge for a manually-typed address.
  // Sends a verification email (with a {{VERIFICATION_URL}} placeholder) to
  // the supplied address via the email extension's sendVerificationEmail.
  // Callable by any signed-in user (including pending users, who may verify
  // their email while awaiting admin approval). Returns the email
  // extension's SendResult.
  public shared ({ caller }) func initiateEmailVerification(email : Text) : async EmailClient.SendResult {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    await EmailClient.sendVerificationEmail(
      "no-reply",
      [email],
      "Verify your email address",
      "Please <a href=\"{{VERIFICATION_URL}}\">click here</a> to verify your email address for Bubba 33 Roadie Training.",
    );
  };

  // Replace the caller's stored email with newEmail after manual
  // verification. Checks verifiedEmails.contains(newEmail); if not verified,
  // traps. If verified, replaces the stored email on the caller's profile
  // (no admin label distinguishing SSO vs manual). Callable by the user
  // themselves.
  public shared ({ caller }) func setEmailForUser(newEmail : Text) : async Foundation.UserProfile {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not VerifiedEmails.contains(verifiedEmails, newEmail)) {
      Runtime.trap("Email not verified");
    };
    switch (Foundation.setEmailForUser(profiles, caller, newEmail)) {
      case (?profile) profile;
      case null Runtime.trap("Profile not found");
    };
  };

  // --- Users & roles (admin only) ---

  public shared ({ caller }) func getAllUsers() : async [Foundation.UserProfile] {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    Foundation.listProfiles(profiles);
  };

  public shared ({ caller }) func getUserRole(userId : Principal) : async ?Types.Role {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.getProfile(profiles, userId)) {
      case (?profile) ?profile.role;
      case null null;
    };
  };

  public shared ({ caller }) func setUserRole(userId : Principal, role : Types.Role) : async Foundation.UserProfile {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.setRole(profiles, userId, role)) {
      case (?profile) {
        // Keep the access-control UserRole in sync: an app-domain #admin gets
        // the access-control #admin grant so the admin guard and other
        // admin-only endpoints recognize them.
        switch (role) {
          case (#admin) AccessControl.assignRole(accessControlState, caller, userId, #admin);
          case (_) AccessControl.assignRole(accessControlState, caller, userId, #user);
        };
        profile;
      };
      case null Runtime.trap("Profile not found");
    };
  };

  // --- User approval gate (admin only) ---
  // Admins approve or reject pending users. Approval sets the user's
  // approvalStatus to #approved and grants app access; rejection sets it to
  // #rejected and blocks app access. Both endpoints are admin-only and
  // guarded by the existing AccessControl.isAdmin check. On approval or
  // rejection, a notification email is sent to the Roadie's stored email
  // (if present) via the email extension's sendServiceEmail. The admin
  // notification email on new pending sign-ups continues to be sent from
  // createMyProfile.

  public shared ({ caller }) func approveUser(userId : Principal) : async Foundation.UserProfile {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.approveUser(profiles, userId)) {
      case (?profile) {
        await notifyRoadie(profile, true);
        profile;
      };
      case null Runtime.trap("Profile not found");
    };
  };

  public shared ({ caller }) func rejectUser(userId : Principal) : async Foundation.UserProfile {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.rejectUser(profiles, userId)) {
      case (?profile) {
        await notifyRoadie(profile, false);
        profile;
      };
      case null Runtime.trap("Profile not found");
    };
  };

  // --- Admin user-editing endpoints (admin only) ---
  // Additive to the approval gate. These let an admin edit a Roadie's stored
  // email and photo directly (mirroring the UserAssignmentEditor pattern on
  // the frontend) and re-send the notification email appropriate to the
  // user's current approval status. All three are admin-only, guarded by
  // the same AccessControl.isAdmin check as setUserRole. They do NOT change
  // the user's approval status and do NOT distinguish SSO-verified vs
  // manually-verified emails — the new email simply replaces the old one.

  // Admin-only: replace a user's stored email with the supplied address. No
  // SSO-vs-manual label distinction (mirrors setEmailForUser). Reuses the
  // existing Foundation.setEmailForUser helper (which already takes an id).
  public shared ({ caller }) func setUserEmail(userId : Principal, email : Text) : async Foundation.UserProfile {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.setEmailForUser(profiles, userId, email)) {
      case (?profile) profile;
      case null Runtime.trap("Profile not found");
    };
  };

  // Admin-only: set a user's profile photo URL. The frontend uploads the
  // photo via the object-storage client and persists the resulting URL
  // here. Optional — null clears the photo (frontend falls back to
  // initials avatar). Reuses the existing Foundation.setPhoto helper
  // (which already takes an id).
  public shared ({ caller }) func setUserPhoto(userId : Principal, photo : ?Text) : async Foundation.UserProfile {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.setPhoto(profiles, userId, photo)) {
      case (?profile) profile;
      case null Runtime.trap("Profile not found");
    };
  };

  // Admin-only: re-send the notification email appropriate to the user's
  // current approval status. Does NOT change the user's approval status —
  // it only re-sends the existing notification for that status:
  //   #pending  → the admin pending-approval notification (reuses
  //               collectAdminEmails() and the same body as createMyProfile)
  //   #approved → the Roadie approval notification (reuses notifyRoadie(profile, true))
  //   #rejected → the Roadie denial notification (reuses notifyRoadie(profile, false))
  // Returns an error if the user has no email set (for #approved/#rejected
  // there is no recipient; for #pending the admin notification is gated on
  // the user having an email so the admin knows who is awaiting approval).
  public shared ({ caller }) func resendApprovalEmail(userId : Principal) : async () {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.getProfile(profiles, userId)) {
      case (?profile) {
        switch (profile.email) {
          case null Runtime.trap("User has no email set");
          case (?_) {};
        };
        switch (profile.approvalStatus) {
          case (#pending) {
            let adminEmails = collectAdminEmails();
            if (adminEmails.size() > 0) {
              let body = "A new Roadie has signed up and is awaiting approval.<br><br>"
                # "Name: " # profile.name # "<br>"
                # "Store Location: " # profile.storeLocation # "<br><br>"
                # "Please review and approve or reject this Roadie in the admin Users page.";
              let _ = await EmailClient.sendServiceEmail(
                "no-reply",
                adminEmails,
                "New Roadie pending approval: " # profile.name,
                body,
              );
            };
          };
          case (#approved) {
            await notifyRoadie(profile, true);
          };
          case (#rejected) {
            await notifyRoadie(profile, false);
          };
        };
      };
      case null Runtime.trap("Profile not found");
    };
  };

  // --- Positions ---

  public query func getAllPositions() : async [Foundation.Position] {
    Foundation.listPositions(positions);
  };

  public query func getPosition(id : Nat) : async ?Foundation.Position {
    Foundation.getPosition(positions, id);
  };

  public shared ({ caller }) func createPosition(name : Text, description : ?Text, coverPhoto : ?Text, layoutStyle : Types.LayoutStyle) : async Foundation.Position {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    Foundation.createPosition(positions, nextPositionId, name, description, coverPhoto, layoutStyle);
  };

  public shared ({ caller }) func updatePosition(id : Nat, name : Text, description : ?Text, coverPhoto : ?Text, layoutStyle : Types.LayoutStyle) : async Foundation.Position {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.updatePosition(positions, id, name, description, coverPhoto, layoutStyle)) {
      case (?position) position;
      case null Runtime.trap("Position not found");
    };
  };

  public shared ({ caller }) func deletePosition(id : Nat) : async () {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.deletePosition(positions, id)) {
      case (?_) ();
      case null Runtime.trap("Position not found");
    };
  };

  public shared ({ caller }) func reorderPositions(orderedIds : [Nat]) : async [Foundation.Position] {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    Foundation.reorderPositions(positions, orderedIds);
  };

  // --- Position assignments ---

  public query ({ caller }) func getMyAssignments() : async [Foundation.PositionAssignment] {
    Foundation.getAssignmentsForUser(assignments, caller);
  };

  public shared ({ caller }) func getUserAssignments(userId : Principal) : async [Foundation.PositionAssignment] {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    Foundation.getAssignmentsForUser(assignments, userId);
  };

  public shared ({ caller }) func assignPosition(userId : Principal, positionId : Nat) : async Foundation.PositionAssignment {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    Foundation.assignPosition(assignments, userId, positionId);
  };

  public shared ({ caller }) func unassignPosition(userId : Principal, positionId : Nat) : async () {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.unassignPosition(assignments, userId, positionId)) {
      case (?_) ();
      case null Runtime.trap("Assignment not found");
    };
  };

  public shared ({ caller }) func setAssignmentStatus(userId : Principal, positionId : Nat, status : Types.AssignmentStatus) : async Foundation.PositionAssignment {
    AccessControlAdminGuard.initialize(accessControlState, profiles, caller);
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: admin only");
    };
    switch (Foundation.setAssignmentStatus(assignments, userId, positionId, status)) {
      case (?assignment) assignment;
      case null Runtime.trap("Assignment not found");
    };
  };

  // --- Helpers ---

  // Collect the email addresses of every admin who has one on file. Used by
  // createMyProfile to send the pending-approval notification. Sources:
  //   - accessControlState.userRoles entries with #admin
  //   - each admin's stored profile .email (the SSO-captured verified email)
  // An admin with no email on file is silently skipped (no address to send
  // to). Returns a deduplicated array.
  func collectAdminEmails() : [Text] {
    let seen = Set.empty<Text>();
    let emails = List.empty<Text>();
    for ((principal, role) in accessControlState.userRoles.entries()) {
      if (role == #admin) {
        switch (Foundation.getProfile(profiles, principal)) {
          case (?profile) {
            switch (profile.email) {
              case (?email) {
                if (not seen.contains(email)) {
                  seen.add(email);
                  emails.add(email);
                };
              };
              case null {};
            };
          };
          case null {};
        };
      };
    };
    emails.toArray();
  };

  // Send the Roadie approval/denial notification email to the Roadie's
  // stored email (if present). approved=true sends the approval message,
  // approved=false sends the denial message. Silently skips when the Roadie
  // has no email on file.
  func notifyRoadie(profile : Foundation.UserProfile, approved : Bool) : async () {
    switch (profile.email) {
      case (?email) {
        let (subject, body) = if (approved) {
          (
            "Your access to Bubba 33 Roadie Training has been approved",
            "Hello " # profile.name # ",<br><br>"
              # "Your access to Bubba 33 Roadie Training has been approved. "
              # "You can now sign in and begin your training.<br><br>"
              # "Welcome aboard!",
          );
        } else {
          (
            "Your access to Bubba 33 Roadie Training has been denied",
            "Hello " # profile.name # ",<br><br>"
              # "Your request for access to Bubba 33 Roadie Training has been denied. "
              # "If you believe this is an error, please contact your manager.",
          );
        };
        let _ = await EmailClient.sendServiceEmail("no-reply", [email], subject, body);
      };
      case null {};
    };
  };
};
