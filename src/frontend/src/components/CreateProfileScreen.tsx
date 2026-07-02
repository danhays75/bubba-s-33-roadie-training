import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateMyProfile } from "@/hooks/useMyProfile";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Profile-creation form shown on first sign-in (name + store/location).
 *
 * Dark themed, mobile-first, single column. The first user to sign up
 * becomes Admin (handled backend-side); the rest default to trainee.
 */
export function CreateProfileScreen() {
  const [name, setName] = useState("");
  const [storeLocation, setStoreLocation] = useState("");
  const createProfile = useCreateMyProfile();

  const trimmedName = name.trim();
  const trimmedStore = storeLocation.trim();
  const canSubmit =
    trimmedName.length > 0 &&
    trimmedStore.length > 0 &&
    !createProfile.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    createProfile.mutate(
      { name: trimmedName, storeLocation: trimmedStore },
      {
        onSuccess: () => toast.success("Profile created. Welcome aboard."),
        onError: (err) =>
          toast.error(err.message || "Could not create profile. Try again."),
      },
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="font-display text-4xl uppercase leading-none tracking-wide text-foreground">
            Bubba&rsquo;s 33
          </h1>
          <p className="mt-2 font-heading text-sm uppercase tracking-[0.2em] text-muted-foreground">
            One last step
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col gap-5"
          data-ocid="create_profile.form"
        >
          <div className="flex flex-col gap-2">
            <Label
              htmlFor="name"
              className="font-heading uppercase tracking-wide"
            >
              Your name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jordan Rivera"
              autoComplete="name"
              required
              data-ocid="create_profile.name_input"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="storeLocation"
              className="font-heading uppercase tracking-wide"
            >
              Store / Location
            </Label>
            <Input
              id="storeLocation"
              value={storeLocation}
              onChange={(e) => setStoreLocation(e.target.value)}
              placeholder="Fort Worth, TX"
              required
              data-ocid="create_profile.store_input"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="mt-2 w-full font-heading uppercase tracking-wide"
            disabled={!canSubmit}
            data-ocid="create_profile.submit_button"
          >
            {createProfile.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Start training"
            )}
          </Button>

          {createProfile.isError && (
            <p
              role="alert"
              className="font-body text-sm text-primary"
              data-ocid="create_profile.error_state"
            >
              {createProfile.error?.message || "Could not save profile."}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
