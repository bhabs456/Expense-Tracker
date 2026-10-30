"use client";
import { useState } from "react";
import { PageHeader, Loading, ErrorState } from "@/components/ui/Primitives";
import {
  TransactionFilters,
  Pagination,
} from "@/components/shared/TransactionFilters";
import { useResource } from "@/hooks/useResource";
import { EMPTY_FILTERS } from "@/constants/finance";
import { expenseService } from "../services/expenseService";
import { ExpenseRecords } from "./ExpenseRecords";
export function ExpenseHistoryPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS),
    [page, setPage] = useState(1);
  const { data, loading, error, reload } = useResource(
    () => expenseService.list(filters, page),
    JSON.stringify({ filters, page }),
  );
  return (
    <>
      <PageHeader
        title="Expense History"
        description="Every regular expense, easy to find."
      />
      <section className="panel">
        <TransactionFilters
          value={filters}
          onChange={(v) => {
            setFilters(v);
            setPage(1);
          }}
        />
        {error ? (
          <ErrorState message={error} retry={reload} />
        ) : loading ? (
          <Loading />
        ) : (
          <>
            <ExpenseRecords rows={data?.items || []} />
            <Pagination
              total={data?.total || 0}
              page={page}
              onChange={setPage}
            />
          </>
        )}
      </section>
    </>
  );
}
