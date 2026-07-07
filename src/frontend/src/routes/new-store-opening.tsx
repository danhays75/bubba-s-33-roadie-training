import { NsoBulkImportDialog } from "@/components/nso/NsoBulkImportDialog";
import { NsoPhaseFormDialog } from "@/components/nso/NsoPhaseFormDialog";
import { NsoPhaseSection } from "@/components/nso/NsoPhaseSection";
import { Button } from "@/components/ui/button";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useNsoOverallProgress, useNsoPhases } from "@/hooks/useNso";
import { Link } from "@tanstack/react-router";
import { ClipboardList, Plus, ShieldAlert, Upload } from "lucide-react";
import { useState } from "react";

/**
 * New Store Opening — manager/admin tracker page.
 *
 * Composes the NSO components built in the previous wave:
 *   - Overall progress card (X of Y tasks complete — Z%) with a red-filled
 *     progress bar driven by useNsoOverallProgress().
 *   - Phase list: each phase rendered as a collapsible <NsoPhaseSection />,
 *     mapped in sortOrder (the hook already sorts).
 *   - Page header with "Add phase" (primary red) and "Import tasks"
 *     (outline + red border) buttons.
 *   - Loading and empty states.
 *
 * Role gate is preserved from the original stub: only Manager and Admin
 * profiles may view this page; Trainees and Trainers see AccessDenied.
 * Immediate-save on checkbox toggle is handled inside <NsoTaskRow /> —
 * this page only composes the components.
 */
export function NsoPage() {
  const { data: profile } = useMyProfile();

  // While profile is loading, myProfile is undefined — render a quiet dark
  // placeholder rather than flashing access-denied.
  if (profile === undefined) {
    return <div className="min-h-dvh bg-background" aria-hidden />;
  }

  const canAccess = profile?.role === "admin" || profile?.role === "manager";
  if (!canAccess) {
    return <AccessDenied />;
  }

  return <NsoTracker />;
}

function NsoTracker() {
  const { data: phases, isLoading } = useNsoPhases();
  const { data: progress } = useNsoOverallProgress();

  const [importOpen, setImportOpen] = useState(false);
  const [phaseFormOpen, setPhaseFormOpen] = useState(false);

  const doneCount = progress?.doneCount ?? 0;
  const totalCount = progress?.totalCount ?? 0;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const phaseList = phases ?? [];

  return (
    <div
      className="mx-auto w-full max-w-3xl px-4 py-8"
      data-ocid="nso.page.section"
    >
      {/* Page header — title + actions */}
      <header
        className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between"
        data-ocid="nso.header.section"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="size-6 text-primary" />
          <h1
            className="font-display text-3xl uppercase leading-none tracking-wide text-foreground"
            data-ocid="nso.title"
          >
            New Store Opening
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="rounded border-primary/60 font-heading uppercase tracking-wide hover:bg-primary/10 hover:text-primary"
            data-ocid="nso.import_button"
          >
            <Upload />
            Import tasks
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setPhaseFormOpen(true)}
            className="rounded font-heading uppercase tracking-wide"
            data-ocid="nso.add_phase_button"
          >
            <Plus />
            Add phase
          </Button>
        </div>
      </header>

      {/* Overall progress card */}
      <section
        className="mb-6 rounded-md border border-border bg-card p-4"
        data-ocid="nso.overall_progress.card"
        aria-label="Overall opening progress"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p
            className="font-heading text-sm uppercase tracking-wide text-foreground"
            data-ocid="nso.overall_progress.label"
          >
            Overall progress
          </p>
          <p
            className="font-body text-sm text-muted-foreground"
            data-ocid="nso.overall_progress.count"
          >
            <span className="font-heading text-base text-foreground">
              {doneCount}
            </span>{" "}
            of{" "}
            <span className="font-heading text-base text-foreground">
              {totalCount}
            </span>{" "}
            tasks complete —{" "}
            <span className="font-heading text-base text-primary">{pct}%</span>
          </p>
        </div>
        <div
          className="mt-3 h-2.5 w-full overflow-hidden rounded bg-muted"
          role="progressbar"
          tabIndex={0}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Percent of opening tasks complete"
          data-ocid="nso.overall_progress.bar"
        >
          <div
            className="h-full rounded bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
            data-ocid="nso.overall_progress.fill"
          />
        </div>
      </section>

      {/* Phase list / loading / empty */}
      {isLoading ? (
        <p
          className="py-12 text-center font-body text-sm text-muted-foreground"
          data-ocid="nso.phases.loading_state"
        >
          Loading…
        </p>
      ) : phaseList.length === 0 ? (
        <EmptyState
          onAddPhase={() => setPhaseFormOpen(true)}
          onImport={() => setImportOpen(true)}
        />
      ) : (
        <div className="flex flex-col gap-3" data-ocid="nso.phases.list">
          {phaseList.map((phase, index) => (
            <NsoPhaseSection
              key={phase.id}
              phase={phase}
              index={index}
              total={phaseList.length}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <NsoBulkImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <NsoPhaseFormDialog
        open={phaseFormOpen}
        onOpenChange={setPhaseFormOpen}
      />
    </div>
  );
}

function EmptyState({
  onAddPhase,
  onImport,
}: {
  onAddPhase: () => void;
  onImport: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-4 py-12 text-center"
      data-ocid="nso.phases.empty_state"
    >
      <div
        className="flex size-12 items-center justify-center rounded-full bg-nav text-primary"
        aria-hidden
      >
        <ClipboardList className="size-6" />
      </div>
      <h2
        className="font-heading text-lg uppercase tracking-wide text-foreground"
        data-ocid="nso.phases.empty_state.title"
      >
        No phases yet
      </h2>
      <p className="max-w-sm font-body text-sm text-muted-foreground">
        Add a phase or import tasks to get started.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onImport}
          className="rounded border-primary/60 font-heading uppercase tracking-wide hover:bg-primary/10 hover:text-primary"
          data-ocid="nso.phases.empty_state.import_button"
        >
          <Upload />
          Import tasks
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onAddPhase}
          className="rounded font-heading uppercase tracking-wide"
          data-ocid="nso.phases.empty_state.add_phase_button"
        >
          <Plus />
          Add phase
        </Button>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-4 px-4 py-20 text-center"
      data-ocid="nso.access_denied"
    >
      <ShieldAlert className="size-10 text-primary" />
      <h1 className="font-display text-3xl uppercase leading-none tracking-wide text-foreground">
        Managers only
      </h1>
      <p className="max-w-xs font-body text-sm text-muted-foreground">
        You need a Manager or Admin role to view the New Store Opening tracker.
        Ask an admin to upgrade your account.
      </p>
      <Button asChild variant="default" data-ocid="nso.go_home_button">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}

export default NsoPage;
