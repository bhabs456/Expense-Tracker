import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/components/layouts/WorkspaceProvider";
import { WorkspaceShell } from "@/components/layouts/WorkspaceShell";
export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
