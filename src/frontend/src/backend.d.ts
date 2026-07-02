import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Result = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface Position {
    id: bigint;
    sortOrder: bigint;
    name: string;
    description?: string;
    coverPhoto?: string;
}
export interface PositionAssignment {
    status: AssignmentStatus;
    userId: Principal;
    positionId: bigint;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface UserProfile {
    id: Principal;
    name: string;
    role: Role;
    storeLocation: string;
}
export enum AssignmentStatus {
    inTraining = "inTraining",
    certified = "certified"
}
export enum Role {
    manager = "manager",
    admin = "admin",
    trainee = "trainee",
    trainer = "trainer"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignPosition(userId: Principal, positionId: bigint): Promise<PositionAssignment>;
    createMyProfile(name: string, storeLocation: string): Promise<UserProfile>;
    createPosition(name: string, description: string | null, coverPhoto: string | null): Promise<Position>;
    deletePosition(id: bigint): Promise<void>;
    getAllPositions(): Promise<Array<Position>>;
    getAllUsers(): Promise<Array<UserProfile>>;
    getCallerUserRole(): Promise<UserRole>;
    getMyAssignments(): Promise<Array<PositionAssignment>>;
    getMyProfile(): Promise<UserProfile | null>;
    getPosition(id: bigint): Promise<Position | null>;
    getUserAssignments(userId: Principal): Promise<Array<PositionAssignment>>;
    getUserRole(userId: Principal): Promise<Role | null>;
    isCallerAdmin(): Promise<boolean>;
    reorderPositions(orderedIds: Array<bigint>): Promise<Array<Position>>;
    setAssignmentStatus(userId: Principal, positionId: bigint, status: AssignmentStatus): Promise<PositionAssignment>;
    setUserRole(userId: Principal, role: Role): Promise<UserProfile>;
    unassignPosition(userId: Principal, positionId: bigint): Promise<void>;
    updateMyProfile(name: string, storeLocation: string): Promise<UserProfile>;
    updatePosition(id: bigint, name: string, description: string | null, coverPhoto: string | null): Promise<Position>;
}
