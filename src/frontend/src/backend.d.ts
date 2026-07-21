import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UpdateActivityInput {
    id: bigint;
    content?: ActivityContent;
    name: string;
    sourceCategoryIds: Array<bigint>;
}
export interface DrinksBuilderSettings {
    includedCategories: Array<string>;
    enforceAssemblyOrder: boolean;
    pointsPerCorrect: bigint;
    excludedDrinkTitles: Array<string>;
    showScoring: boolean;
    requireExactAmounts: boolean;
    soundDefault: boolean;
    decoyCount: bigint;
    streakMultiplier: boolean;
    roundsPerSession: bigint;
}
export interface RecipeSpec {
    ingredient: string;
    amount: string;
}
export type QuizContent = Array<Question>;
export interface Task {
    id: bigint;
    completionDate?: string;
    assignedTo?: Principal;
    sortOrder: bigint;
    done: boolean;
    text: string;
    section?: string;
    notes?: string;
    phaseId: bigint;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface FlashcardRecipe {
    glassware: string;
    garnish: Array<string>;
    specs: Array<{
        ingredient: string;
        amount: string;
    }>;
    assembly: Array<string>;
}
export interface Phase {
    id: bigint;
    sortOrder: bigint;
    name: string;
}
export interface DetailField {
    value: string;
    fieldLabel: string;
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
    recipe?: Recipe;
}
export interface RecipeVariant {
    variantLabel: string;
    specs: Array<RecipeSpec>;
    assembly: Array<string>;
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
export interface NsoPhaseProgressCount {
    doneCount: bigint;
    totalCount: bigint;
    phaseId: bigint;
}
export interface Category {
    id: bigint;
    sortOrder: bigint;
    name: string;
    positionId: bigint;
    coverPhoto?: string;
}
export type FlashcardContent = Array<Flashcard>;
export interface NsoImportInput {
    moduleName: string;
    phases: Array<NsoImportPhase>;
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
export interface DrinksBuilderContent {
    settings: DrinksBuilderSettings;
}
export interface BuildActivityInput {
    activityType: ActivityType;
    content?: ActivityContent;
    name: string;
    positionId: bigint;
    sourceCategoryIds: Array<bigint>;
}
export type ActivityContent = {
    __kind__: "drinksBuilderContent";
    drinksBuilderContent: DrinksBuilderContent;
} | {
    __kind__: "quizContent";
    quizContent: QuizContent;
} | {
    __kind__: "flashcardContent";
    flashcardContent: FlashcardContent;
};
export interface Activity {
    id: bigint;
    activityType: ActivityType;
    content: ActivityContent;
    name: string;
    createdAt: bigint;
    createdBy: Principal;
    positionId: bigint;
    sourceCategoryIds: Array<bigint>;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export interface Position {
    id: bigint;
    layoutStyle: LayoutStyle;
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
export interface NsoImportTask {
    text: string;
    section?: string;
    notes?: string;
}
export interface NsoImportSummary {
    phasesCreated: bigint;
    phasesReused: bigint;
    tasksAdded: bigint;
}
export interface NsoImportPhase {
    tasks: Array<NsoImportTask>;
    name: string;
}
export interface Flashcard {
    itemTitle: string;
    detailFields: Array<{
        value: string;
        fieldLabel: string;
    }>;
    itemPhoto?: string;
    recipe?: FlashcardRecipe;
}
export interface Recipe {
    equipment: Array<string>;
    glassware: string;
    variants: Array<RecipeVariant>;
    garnish: Array<string>;
    qualityIdentifier: Array<string>;
    specs: Array<RecipeSpec>;
    shelfLife?: string;
    assembly: Array<string>;
    yield?: string;
}
export type Question = {
    __kind__: "multipleChoice";
    multipleChoice: {
        correctIndex: bigint;
        prompt: string;
        choices: Array<string>;
    };
} | {
    __kind__: "matching";
    matching: {
        pairs: Array<{
            itemTitle: string;
            fieldValue: string;
        }>;
        shuffledOptions: Array<string>;
    };
} | {
    __kind__: "trueFalse";
    trueFalse: {
        statement: string;
        isTrue: boolean;
    };
};
export interface UserProfile {
    id: Principal;
    name: string;
    role: Role;
    storeLocation: string;
}
export enum ActivityType {
    drinksBuilder = "drinksBuilder",
    quiz = "quiz",
    flashcards = "flashcards"
}
export enum AssignmentStatus {
    inTraining = "inTraining",
    certified = "certified"
}
export enum LayoutStyle {
    library = "library",
    orientation = "orientation"
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
export enum Variant_up_down {
    up = "up",
    down = "down"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignPosition(userId: Principal, positionId: bigint): Promise<PositionAssignment>;
    buildLegendaryActivity(input: BuildActivityInput): Promise<Activity>;
    createCategory(positionId: bigint, name: string, coverPhoto: string | null): Promise<Category>;
    createItem(categoryId: bigint, title: string, subtitle: string | null, photo: string | null, details: Array<DetailField>, notes: string | null, tags: Array<string>, seasonal: boolean, recipe: Recipe | null): Promise<LibraryItem>;
    createMyProfile(name: string, storeLocation: string): Promise<UserProfile>;
    createNsoPhase(name: string): Promise<Phase>;
    createNsoTask(phaseId: bigint, text: string, section: string | null, assignedTo: Principal | null): Promise<Task>;
    createPosition(name: string, description: string | null, coverPhoto: string | null, layoutStyle: LayoutStyle): Promise<Position>;
    deleteCategory(categoryId: bigint): Promise<void>;
    deleteItem(itemId: bigint): Promise<void>;
    deleteLegendaryActivity(id: bigint): Promise<void>;
    deleteNsoPhase(id: bigint): Promise<void>;
    deleteNsoTask(id: bigint): Promise<void>;
    deletePosition(id: bigint): Promise<void>;
    execute(qJson: string): Promise<Result>;
    getAllPositions(): Promise<Array<Position>>;
    getAllUsers(): Promise<Array<UserProfile>>;
    getCallerUserRole(): Promise<UserRole>;
    getCategoriesByPosition(positionId: bigint): Promise<Array<Category>>;
    getCategory(categoryId: bigint): Promise<Category | null>;
    getDrinksBuilderDecoyPool(activityId: bigint): Promise<Array<LibraryItem>>;
    getDrinksBuilderPlayablePool(activityId: bigint): Promise<Array<LibraryItem>>;
    getItem(itemId: bigint): Promise<LibraryItem | null>;
    getItemsByCategory(categoryId: bigint): Promise<Array<LibraryItem>>;
    getLegendaryActivitiesByPosition(positionId: bigint): Promise<Array<Activity>>;
    getLegendaryActivity(id: bigint): Promise<Activity | null>;
    getMyAssignments(): Promise<Array<PositionAssignment>>;
    getMyProfile(): Promise<UserProfile | null>;
    getNsoAssignableUsers(): Promise<Array<UserProfile>>;
    getNsoOverallProgress(): Promise<{
        doneCount: bigint;
        totalCount: bigint;
    }>;
    getNsoPhase(id: bigint): Promise<Phase | null>;
    getNsoPhaseProgressCounts(): Promise<Array<NsoPhaseProgressCount>>;
    getNsoPhases(): Promise<Array<Phase>>;
    getNsoTask(id: bigint): Promise<Task | null>;
    getNsoTasksByPhase(phaseId: bigint): Promise<Array<Task>>;
    getPosition(id: bigint): Promise<Position | null>;
    getUserAssignments(userId: Principal): Promise<Array<PositionAssignment>>;
    getUserRole(userId: Principal): Promise<Role | null>;
    importNsoTasks(input: NsoImportInput): Promise<NsoImportSummary>;
    isCallerAdmin(): Promise<boolean>;
    rebuildLegendaryActivity(id: bigint): Promise<Activity>;
    reorderCategories(positionId: bigint, orderedCategoryIds: Array<bigint>): Promise<Array<Category>>;
    reorderItems(categoryId: bigint, orderedItemIds: Array<bigint>): Promise<Array<LibraryItem>>;
    reorderNsoPhases(id: bigint, direction: Variant_up_down): Promise<void>;
    reorderNsoTasks(id: bigint, direction: Variant_up_down): Promise<void>;
    reorderPositions(orderedIds: Array<bigint>): Promise<Array<Position>>;
    schema(): Promise<string>;
    searchLibrary(positionId: bigint, searchText: string): Promise<Array<LibraryItem>>;
    setAssignmentStatus(userId: Principal, positionId: bigint, status: AssignmentStatus): Promise<PositionAssignment>;
    setNsoTaskAssignment(id: bigint, assignedTo: Principal | null): Promise<void>;
    setNsoTaskCompletionDate(id: bigint, completionDate: string | null): Promise<void>;
    setUserRole(userId: Principal, role: Role): Promise<UserProfile>;
    toggleNsoTask(id: bigint, done: boolean, completionDate: string | null): Promise<void>;
    unassignPosition(userId: Principal, positionId: bigint): Promise<void>;
    updateCategory(categoryId: bigint, name: string, coverPhoto: string | null): Promise<Category>;
    updateItem(itemId: bigint, title: string, subtitle: string | null, photo: string | null, details: Array<DetailField>, notes: string | null, tags: Array<string>, seasonal: boolean, recipe: Recipe | null): Promise<LibraryItem>;
    updateLegendaryActivity(input: UpdateActivityInput): Promise<Activity>;
    updateMyProfile(name: string, storeLocation: string): Promise<UserProfile>;
    updateNsoPhase(id: bigint, name: string): Promise<void>;
    updateNsoTask(id: bigint, text: string, section: string | null, done: boolean, assignedTo: Principal | null, completionDate: string | null, notes: string | null): Promise<void>;
    updatePosition(id: bigint, name: string, description: string | null, coverPhoto: string | null, layoutStyle: LayoutStyle): Promise<Position>;
}
