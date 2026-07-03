import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
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
export interface DetailField {
    value: string;
    fieldLabel: string;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
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
export interface Cell {
    value: Value;
    name: string;
}
export interface LibraryItem {
    id: bigint;
    categoryId: bigint;
    title: string;
    sortOrder: bigint;
    tags: Array<string>;
    seasonal: boolean;
    notes?: string;
    details: Array<DetailField>;
    photo?: string;
    subtitle?: string;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export interface UserProfile {
    id: Principal;
    name: string;
    role: Role;
    storeLocation: string;
}
export interface Category {
    id: bigint;
    sortOrder: bigint;
    name: string;
    positionId: bigint;
    coverPhoto?: string;
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
    createCategory(positionId: bigint, name: string, coverPhoto: string | null): Promise<Category>;
    createItem(categoryId: bigint, title: string, subtitle: string | null, photo: string | null, details: Array<DetailField>, notes: string | null, tags: Array<string>, seasonal: boolean): Promise<LibraryItem>;
    createMyProfile(name: string, storeLocation: string): Promise<UserProfile>;
    createPosition(name: string, description: string | null, coverPhoto: string | null): Promise<Position>;
    deleteCategory(categoryId: bigint): Promise<void>;
    deleteItem(itemId: bigint): Promise<void>;
    deletePosition(id: bigint): Promise<void>;
    execute(qJson: string): Promise<Result>;
    getAllPositions(): Promise<Array<Position>>;
    getAllUsers(): Promise<Array<UserProfile>>;
    getCallerUserRole(): Promise<UserRole>;
    getCategoriesByPosition(positionId: bigint): Promise<Array<Category>>;
    getCategory(categoryId: bigint): Promise<Category | null>;
    getItem(itemId: bigint): Promise<LibraryItem | null>;
    getItemsByCategory(categoryId: bigint): Promise<Array<LibraryItem>>;
    getMyAssignments(): Promise<Array<PositionAssignment>>;
    getMyProfile(): Promise<UserProfile | null>;
    getPosition(id: bigint): Promise<Position | null>;
    getUserAssignments(userId: Principal): Promise<Array<PositionAssignment>>;
    getUserRole(userId: Principal): Promise<Role | null>;
    isCallerAdmin(): Promise<boolean>;
    reorderCategories(positionId: bigint, orderedCategoryIds: Array<bigint>): Promise<Array<Category>>;
    reorderItems(categoryId: bigint, orderedItemIds: Array<bigint>): Promise<Array<LibraryItem>>;
    reorderPositions(orderedIds: Array<bigint>): Promise<Array<Position>>;
    schema(): Promise<string>;
    searchLibrary(positionId: bigint, searchText: string): Promise<Array<LibraryItem>>;
    setAssignmentStatus(userId: Principal, positionId: bigint, status: AssignmentStatus): Promise<PositionAssignment>;
    setUserRole(userId: Principal, role: Role): Promise<UserProfile>;
    unassignPosition(userId: Principal, positionId: bigint): Promise<void>;
    updateCategory(categoryId: bigint, name: string, coverPhoto: string | null): Promise<Category>;
    updateItem(itemId: bigint, title: string, subtitle: string | null, photo: string | null, details: Array<DetailField>, notes: string | null, tags: Array<string>, seasonal: boolean): Promise<LibraryItem>;
    updateMyProfile(name: string, storeLocation: string): Promise<UserProfile>;
    updatePosition(id: bigint, name: string, description: string | null, coverPhoto: string | null): Promise<Position>;
}
