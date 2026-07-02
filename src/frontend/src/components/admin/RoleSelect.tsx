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

export function RoleSelect({
  value,
  onValueChange,
  disabled,
  index,
}: {
  value: Role;
  onValueChange: (role: Role) => void;
  disabled?: boolean;
  index: number;
}) {
  return (
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
        aria-label={`Set role for user ${index}`}
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
  );
}
