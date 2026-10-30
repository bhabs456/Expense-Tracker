"use client";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Primitives";
import { ExpenseFields, expenseInput } from "@/components/shared/ExpenseFields";
import { useMutation } from "@/hooks/useMutation";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
import { todayInIndia } from "@/utils/format";
import type {
  SavingsTransaction,
  SavingsInput,
  TransactionType,
} from "@/types/finance";
import { ledgerService } from "../services/ledgerService";
export function LedgerEditor({
  transaction,
  onClose,
}: {
  transaction?: SavingsTransaction;
  onClose: () => void;
}) {
  const { catalog, preferences } = useWorkspace();
  const { run, busy } = useMutation();
  const [dirty, setDirty] = useState(false);
  const [value, setValue] = useState<SavingsInput>(
    transaction
      ? { ...expenseInput(transaction), type: transaction.type }
      : {
          amount: "",
          date: catalog?.today || todayInIndia(),
          category: "Food & Drinks",
          subcategory: "",
          payment_method: preferences?.default_payment_method || "UPI",
          notes: "",
          type: "debit",
        },
  );
  return (
    <Dialog
      title={(transaction ? "Edit" : "Add") + " savings transaction"}
      onClose={onClose}
      dirty={dirty}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await run((flags) =>
              ledgerService.save(value, flags, transaction?.id),
            )
          )
            onClose();
        }}
      >
        <Field label="Transaction type">
          <select
            value={value.type}
            onChange={(e) => {
              const type = e.target.value as TransactionType;
              setValue({
                ...value,
                type,
                category: type === "credit" ? "Bonus" : "Food & Drinks",
                subcategory: "",
              });
              setDirty(true);
            }}
          >
            <option value="debit">Debit · purchase from savings</option>
            <option value="credit">Credit · add money to savings</option>
          </select>
        </Field>
        <ExpenseFields
          value={value}
          credit={value.type === "credit"}
          onChange={(v) => {
            setValue(v);
            setDirty(true);
          }}
        />
        <div className="form-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            Save transaction
          </button>
        </div>
      </form>
    </Dialog>
  );
}
