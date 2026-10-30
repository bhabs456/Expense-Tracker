"use client";
import { PageHeader, Loading } from "@/components/ui/Primitives";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
import { PreferencesForm } from "./PreferencesForm";
import { BackupPanel, BackupList } from "./BackupPanel";
export function SettingsPage() {
  const { preferences } = useWorkspace();
  return (
    <>
      <PageHeader
        title="Settings"
        description="Make this space yours. Keep your data safe."
      />
      {preferences ? (
        <div className="settings-grid">
          <PreferencesForm />
          <BackupPanel />
          <BackupList />
        </div>
      ) : (
        <Loading />
      )}
    </>
  );
}
