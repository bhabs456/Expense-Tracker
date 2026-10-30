"use client";
import { ErrorState } from "@/components/ui/Primitives";
export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      message="This page could not load. Your saved records are safe."
      retry={reset}
    />
  );
}
