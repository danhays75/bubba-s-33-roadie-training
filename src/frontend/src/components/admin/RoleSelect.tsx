import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/foundation";

/**
 * Role picker for a user row. Bound to the four-role enum (trainee, trainer,
 * manager, admin). On change, calls back with the new role so the parent can
 * fire `useSetUserRole`.
 *
 * Flat styling, dark theme. The trigger shows the current role in Oswald;
 * the active role gets a subtle red accent on the trigger border so red
 * dominates the identity without overwhelming the table.
 */
const ROLES: { value: Role; label: string }[] = [
  { value: "trainee", label: "Trainee" },
  { value: "trainer", label: "Trainer" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

export type RoleSelectProps = {
  value: Role;
  onValueChange: (role: Role) => void;
  disabled?: boolean;
  /**
   * Optional muted hint rendered beneath the trigger when the control is
   * disabled. Used to explain WHY the role is locked (e.g. self-lockout
   * protection, last-admin protection). Only rendered when `disabled` is
   * true and a hint is provided.
   */
  disabledHint?: string;
  /** Row index — used only for the data-ocid test hook. */
  index: number;
  /**
   * Human-readable identifier for the user this control belongs to.
   * Prefer the user's display name; fall back to a shortened principal
   * (e.g. `principal abc123…xyz4`) when no name is available. Used to
   * build an accessible aria-label that names the actual user rather
   * than a positional row number.
   */
  userLabel: string;
};

export function RoleSelect({
  value,
  onValueChange,
  disabled,
  disabledHint,
  index,
  userLabel,
}: RoleSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <Select
        value={value}
        onValueChange={(v) => onValueChange(v as Role)}
        disabled={disabled}
      >
        <SelectTrigger
          size="sm"
          className={cn(
            "w-32 border-border bg-card font-heading text-xs uppercase tracking-wide",
            "data-[placeholder]:text-muted-foreground",
            value === "admin" && "border-primary text-primary",
          )}
          data-ocid={`user.role.select.${index}`}
          aria-label={`Set role for ${userLabel}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((role) => (
            <SelectItem
              key={role.value}
              value={role.value}
              className="font-heading text-xs uppercase tracking-wide"
            >
              {role.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {disabled && disabledHint ? (
        <p
          className="max-w-[12rem] font-body text-[0.65rem] leading-tight text-muted-foreground"
          data-ocid={`user.role.disabled_hint.${index}`}
        >
          {disabledHint}
        </p>
      ) : null}
    </div>
  );
}
