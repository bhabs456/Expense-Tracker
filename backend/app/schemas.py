from datetime import date
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
from zoneinfo import ZoneInfo
from datetime import datetime


def today():
    return datetime.now(ZoneInfo("Asia/Kolkata")).date()


Money = Decimal


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ExpenseIn(Strict):
    amount: Money = Field(gt=0, max_digits=14, decimal_places=2)
    date: date
    category: str = Field(min_length=1, max_length=100)
    subcategory: str = Field(default="", max_length=100)
    payment_method: str = Field(min_length=1, max_length=100)
    notes: str = Field(default="", max_length=2000)

    @model_validator(mode="after")
    def no_future(self):
        if self.date > today():
            raise ValueError("Transaction dates cannot be in the future")
        return self


class BatchRow(ExpenseIn):
    savings_funded: bool = False


class BatchIn(Strict):
    items: list[BatchRow] = Field(min_length=1, max_length=100)
    confirm_duplicates: bool = False
    confirm_negative_savings: bool = False


class SavingsIn(ExpenseIn):
    type: Literal["credit", "debit"]
    confirm_negative_savings: bool = False


class RefundIn(Strict):
    amount: Money = Field(gt=0, max_digits=14, decimal_places=2)
    date: date
    notes: str = Field(default="", max_length=2000)


class StipendIn(Strict):
    earning_month: date
    expected_amount: Money = Field(ge=0, max_digits=14, decimal_places=2)
    received_amount: Money = Field(default=0, ge=0, max_digits=14, decimal_places=2)
    received_date: date | None = None
    confirmed: bool = False

    @model_validator(mode="after")
    def valid_receipt(self):
        if self.earning_month.day != 1:
            raise ValueError("Earning month must be its first day")
        if self.confirmed and (not self.received_date or self.received_amount <= 0):
            raise ValueError(
                "Confirmed stipends need a positive amount and received date"
            )
        if self.received_date and self.received_date > today():
            raise ValueError("Receipt cannot be in the future")
        return self


class SubscriptionIn(Strict):
    name: str = Field(min_length=1, max_length=100)
    amount: Money = Field(gt=0, max_digits=14, decimal_places=2)
    start_date: date
    payment_method: str = Field(min_length=1, max_length=100)
    category: str = Field(default="Subscriptions", min_length=1, max_length=100)
    first_payment_made: bool = False
    one_cycle: bool = False
    billing_months: Literal[1, 3, 6, 9, 12] = 1
    first_billing_date: date | None = None
    existing_expense_id: int | None = None
    subcategory: str = Field(default="", max_length=100)


class SubscriptionEdit(Strict):
    name: str = Field(min_length=1, max_length=100)
    amount: Money = Field(gt=0, max_digits=14, decimal_places=2)
    category: str = Field(min_length=1, max_length=100)
    payment_method: str = Field(min_length=1, max_length=100)
    subcategory: str = Field(default="", max_length=100)

    one_cycle: bool | None = None


class SettingsIn(Strict):
    minimum_savings_percent: Decimal = Field(ge=0, le=100, decimal_places=2)
    stretch_savings_percent: Decimal = Field(ge=0, le=100, decimal_places=2)
    default_payment_method: str = Field(min_length=1, max_length=100)
    theme: Literal["light", "dark", "system"]

    @model_validator(mode="after")
    def ordered(self):
        if self.stretch_savings_percent < self.minimum_savings_percent:
            raise ValueError("Stretch goal must be at least the minimum goal")
        return self
