from datetime import date
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor
import pytest

P = "/api/v1"


def ok(r, status=200):
    assert r.status_code == status, r.text
    return r.json()


def exp(amount="100.00", day="2026-11-10", **kw):
    return dict(
        amount=amount,
        date=day,
        category="Food & Drinks",
        subcategory="Meals",
        payment_method="UPI",
        notes="Lunch",
        **kw,
    )


def batch(c, *items, **kw):
    return c.post(P + "/expenses/batch", json={"items": list(items), **kw})


def stipend(c, month="2026-10-01", amount="1000.00", **kw):
    return c.post(
        P + "/stipends",
        json={
            "earning_month": month,
            "expected_amount": amount,
            "received_amount": amount,
            "received_date": "2026-11-02",
            "confirmed": True,
            **kw,
        },
    )


def dash(c, month="2026-11"):
    return ok(c.get(P + "/dashboard", params={"month": month}))


def tx(c, amount="100.00", type="credit", day="2026-11-05", **kw):
    r = exp(amount, day)
    r.update(
        type=type,
        category="Bonus" if type == "credit" else "Shopping",
        subcategory="",
        **kw,
    )
    return c.post(P + "/savings/transactions", json=r)


def sub(c, day="2026-11-15", **kw):
    return c.post(
        P + "/subscriptions",
        json=dict(
            name="Music",
            amount="100.00",
            start_date=day,
            payment_method="UPI",
            first_payment_made=True,
            **kw,
        ),
    )


def test_stipend_earning_month_allocation_and_late_receipt(client):
    ok(stipend(client, received_date="2027-01-02"), 201)
    assert dash(client)["budget"] == 1000
    assert dash(client, "2026-12")["budget"] == 0


def test_pending_budget(client):
    ok(stipend(client, confirmed=False, received_amount=0, received_date=None), 201)
    d = dash(client)
    assert d["budget"] == 0 and d["stipend_pending"]


def test_exact_decimal_and_refund_recalculation(client):
    ok(stipend(client), 201)
    e = ok(batch(client, exp("123.45")), 201)["items"][0]
    ok(
        client.post(
            f"{P}/expenses/{e['id']}/refunds",
            json={"amount": "23.44", "date": "2027-01-02"},
        ),
        201,
    )
    assert Decimal(str(dash(client)["spending"])) == Decimal("100.01")
    s = ok(client.get(P + "/savings/summary"))
    assert Decimal(str(s["accumulated"])) == Decimal("899.99")


def test_refunds_reject_excess_and_invalid_dates(client):
    e = ok(batch(client, exp()), 201)["items"][0]
    ok(
        client.post(
            f"{P}/expenses/{e['id']}/refunds", json={"amount": 60, "date": "2026-11-11"}
        ),
        201,
    )
    for amount, day in [(41, "2026-11-11"), (1, "2026-11-01"), (1, "2028-01-01")]:
        assert (
            client.post(
                f"{P}/expenses/{e['id']}/refunds", json={"amount": amount, "date": day}
            ).status_code
            == 422
        )
    changed = exp("50")
    assert client.patch(f"{P}/expenses/{e['id']}", json=changed).status_code == 422


def test_delete_requires_confirmation_cascades_refunds(client):
    e = ok(batch(client, exp()), 201)["items"][0]
    ok(
        client.post(
            f"{P}/expenses/{e['id']}/refunds", json={"amount": 25, "date": "2026-11-11"}
        ),
        201,
    )
    assert client.delete(f"{P}/expenses/{e['id']}").status_code == 409
    ok(client.delete(f"{P}/expenses/{e['id']}?confirm=true"))
    assert dash(client)["spending"] == 0
    assert not ok(client.get(P + "/expenses"))["items"]


def test_batch_atomic_validation(client):
    assert batch(client, exp(), exp("-1")).status_code == 422
    assert not ok(client.get(P + "/expenses"))["items"]


def test_batch_domain_validation_is_atomic(client):
    bad = exp()
    bad["category"] = "Custom"
    assert batch(client, exp(), bad).status_code == 422
    assert not ok(client.get(P + "/expenses"))["items"]


def test_duplicate_warning_and_override(client):
    assert batch(client, exp(), exp()).status_code == 409
    assert not ok(client.get(P + "/expenses"))["items"]
    ok(batch(client, exp(), exp(), confirm_duplicates=True), 201)
    assert ok(client.get(P + "/expenses"))["total"] == 2


def test_savings_separation_and_negative_confirmation(client):
    assert batch(client, exp(savings_funded=True)).status_code == 409
    assert not ok(client.get(P + "/savings/transactions"))["items"]
    ok(batch(client, exp(savings_funded=True), confirm_negative_savings=True), 201)
    assert dash(client)["spending"] == 0
    assert not ok(client.get(P + "/calendar?month=2026-11"))["items"]
    assert ok(client.get(P + "/savings/summary"))["accumulated"] == -100
    assert ok(client.get(P + "/analytics?month=2026-11"))["selected"]["spending"] == 0


def test_backdated_running_balances_include_only_available_completed_months(client):
    ok(stipend(client), 201)
    ok(tx(client, "50", day="2026-11-10"), 201)
    ok(tx(client, "200", type="debit", day="2026-12-02"), 201)
    rows = ok(client.get(P + "/savings/transactions"))["items"]
    assert rows[0]["running_balance"] == 850 and rows[1]["running_balance"] == 50
    e = ok(batch(client, exp("100")), 201)["items"][0]
    rows = ok(client.get(P + "/savings/transactions"))["items"]
    assert rows[0]["running_balance"] == 750
    ok(client.patch(f"{P}/expenses/{e['id']}", json=exp("150")))
    assert (
        ok(client.get(P + "/savings/transactions"))["items"][0]["running_balance"]
        == 700
    )


def test_current_month_projection_excluded(client, clock):
    clock[0] = date(2026, 11, 20)
    ok(stipend(client), 201)
    ok(batch(client, exp()), 201)
    s = ok(client.get(P + "/savings/summary"))
    assert s["accumulated"] == 0 and s["projected"] == 900
    clock[0] = date(2026, 12, 1)
    assert ok(client.get(P + "/savings/summary"))["accumulated"] == 900


def test_savings_credit_edit_delete_recompute(client):
    a = ok(tx(client, "100"), 201)
    ok(tx(client, "50", type="debit", day="2026-11-06"), 201)
    edited = exp("25", "2026-11-05")
    edited.update(type="credit", category="Bonus", subcategory="")
    assert (
        client.patch(f"{P}/savings/transactions/{a['id']}", json=edited).status_code
        == 409
    )
    edited["confirm_negative_savings"] = True
    ok(client.patch(f"{P}/savings/transactions/{a['id']}", json=edited))
    assert ok(client.get(P + "/savings/summary"))["accumulated"] == -25
    assert (
        client.delete(f"{P}/savings/transactions/{a['id']}?confirm=true").status_code
        == 409
    )
    ok(
        client.delete(
            f"{P}/savings/transactions/{a['id']}?confirm=true&confirm_negative_savings=true"
        )
    )
    assert ok(client.get(P + "/savings/summary"))["accumulated"] == -50


def test_savings_search_filters_pagination(client):
    ok(tx(client, "100"), 201)
    ok(tx(client, "20", type="debit", day="2026-11-06"), 201)
    r = ok(
        client.get(
            P
            + "/savings/transactions?search=Lunch&type=credit&category=Bonus&payment_method=UPI&start=2026-11-01&end=2026-11-05"
        )
    )
    assert r["total"] == 1 and r["items"][0]["running_balance"] == 100


def test_future_and_prestart_transactions_rejected(client):
    assert batch(client, exp(day="2026-10-31")).status_code == 422
    assert batch(client, exp(day="2028-01-01")).status_code == 422
    assert tx(client, day="2026-10-31").status_code == 422


def test_thirty_day_billing_no_duplicates_tombstones(client, clock):
    clock[0] = date(2027, 1, 31)
    s = ok(sub(client, "2027-01-31"), 201)
    clock[0] = date(2027, 4, 1)
    ok(client.post(P + "/subscriptions/process"))
    rows = ok(client.get(P + "/expenses"))["items"]
    assert {r["date"] for r in rows} == {"2027-01-31", "2027-03-02", "2027-04-01"}
    feb = next(r for r in rows if r["date"] == "2027-03-02")
    ok(client.delete(f"{P}/expenses/{feb['id']}?confirm=true"))
    ok(client.post(P + "/subscriptions/process"))
    ok(client.post(P + "/subscriptions/process"))
    assert ok(client.get(P + "/expenses"))["total"] == 2


def test_pause_resume_skips_paused_months(client, clock):
    clock[0] = date(2026, 11, 15)
    s = ok(sub(client), 201)
    ok(client.post(f"{P}/subscriptions/{s['id']}/pause"))
    clock[0] = date(2027, 1, 20)
    ok(client.post(f"{P}/subscriptions/{s['id']}/resume"))
    clock[0] = date(2027, 2, 15)
    ok(client.post(P + "/subscriptions/process"))
    assert {r["date"] for r in ok(client.get(P + "/expenses"))["items"]} == {
        "2026-11-15",
        "2027-02-13",
    }


def test_subscription_change_only_future_and_delete_preserves_expenses(client, clock):
    clock[0] = date(2026, 11, 15)
    s = ok(sub(client), 201)
    clock[0] = date(2026, 12, 16)
    ok(
        client.patch(
            f"{P}/subscriptions/{s['id']}",
            json={
                "name": "Music",
                "amount": 200,
                "category": "Subscriptions",
                "payment_method": "UPI",
            },
        )
    )
    clock[0] = date(2027, 1, 15)
    ok(client.post(P + "/subscriptions/process"))
    rows = ok(client.get(P + "/expenses"))["items"]
    assert [r["amount"] for r in rows] == [200, 100, 100]
    ok(client.delete(f"{P}/subscriptions/{s['id']}?confirm=true"))
    assert ok(client.get(P + "/expenses"))["total"] == 3
    assert all(
        r["subscription_id"] is None for r in ok(client.get(P + "/expenses"))["items"]
    )


def test_first_payment_match_is_explicit(client, clock):
    clock[0] = date(2026, 11, 15)
    r = exp("100", "2026-11-15")
    r.update(category="Subscriptions", subcategory="")
    e = ok(batch(client, r), 201)["items"][0]
    response = sub(client)
    assert (
        response.status_code == 409
        and response.json()["detail"]["code"] == "initial_payment_match"
    )
    assert not ok(client.get(P + "/subscriptions"))
    ok(sub(client, existing_expense_id=e["id"]), 201)
    assert ok(client.get(P + "/expenses"))["total"] == 1


def test_cancel_stops_future_billing(client, clock):
    clock[0] = date(2026, 11, 15)
    s = ok(sub(client), 201)
    ok(client.post(f"{P}/subscriptions/{s['id']}/cancel"))
    clock[0] = date(2027, 3, 15)
    ok(client.post(P + "/subscriptions/process"))
    assert ok(client.get(P + "/expenses"))["total"] == 1


def test_tracking_start_excludes_subscription_prior_period(client):
    assert sub(client, "2026-10-15").status_code == 422


def test_backup_roundtrip_safety_and_sequences(client):
    ok(stipend(client), 201)
    ok(batch(client, exp("123.45")), 201)
    ok(tx(client, "50.01"), 201)
    backup = ok(client.post(P + "/backups"))
    assert backup["tables"]["expenses"][0]["amount"] == "123.45"
    ok(batch(client, exp("99", "2026-11-11")), 201)
    assert (
        client.post(
            P + "/backups/restore", json={"confirmation": "no", "backup": backup}
        ).status_code
        == 422
    )
    r = ok(
        client.post(
            P + "/backups/restore", json={"confirmation": "RESTORE", "backup": backup}
        )
    )
    safety = ok(client.get(P + "/backups/" + r["safety_backup"]))
    assert len(safety["tables"]["expenses"]) == 2
    assert ok(client.get(P + "/expenses"))["total"] == 1
    e = ok(batch(client, exp("7", "2026-11-12")), 201)["items"][0]
    assert e["id"] > 1
    assert ok(client.get(P + "/savings/summary"))["accumulated"] == 919.56


def test_malformed_backup_preserves_live_data(client):
    ok(batch(client, exp()), 201)
    backup = ok(client.post(P + "/backups"))
    backup["tables"]["expenses"][0]["amount"] = "-5.00"
    assert (
        client.post(
            P + "/backups/restore", json={"confirmation": "RESTORE", "backup": backup}
        ).status_code
        == 422
    )
    assert dash(client)["spending"] == 100
    backup = ok(client.post(P + "/backups"))
    backup["tables"].pop("stipends")
    assert (
        client.post(
            P + "/backups/restore", json={"confirmation": "RESTORE", "backup": backup}
        ).status_code
        == 422
    )
    assert dash(client)["spending"] == 100


def test_safety_backup_failure_preserves_live_data(client, monkeypatch):
    ok(batch(client, exp()), 201)
    backup = ok(client.post(P + "/backups"))
    from app import backups

    monkeypatch.setattr(
        backups, "save", lambda *args: (_ for _ in ()).throw(OSError("Disk full"))
    )
    with pytest.raises(OSError):
        client.post(
            P + "/backups/restore", json={"confirmation": "RESTORE", "backup": backup}
        )
    assert dash(client)["spending"] == 100


def test_settings_validation(client):
    assert (
        client.patch(
            P + "/settings",
            json={
                "minimum_savings_percent": 60,
                "stretch_savings_percent": 40,
                "default_payment_method": "UPI",
                "theme": "dark",
            },
        ).status_code
        == 422
    )
    s = ok(
        client.patch(
            P + "/settings",
            json={
                "minimum_savings_percent": 30,
                "stretch_savings_percent": 60,
                "default_payment_method": "Cash",
                "theme": "dark",
            },
        )
    )
    assert s["theme"] == "dark"


def test_pagination_regular_history(client):
    ok(batch(client, *[exp(str(i + 1)) for i in range(21)]), 201)
    assert len(ok(client.get(P + "/expenses"))["items"]) == 20
    assert len(ok(client.get(P + "/expenses?page=2"))["items"]) == 1


def test_origin_and_host_protection(client):
    assert (
        client.post(
            P + "/backups", headers={"origin": "https://attacker.example"}
        ).status_code
        == 403
    )
    assert (
        client.get(P + "/settings", headers={"host": "attacker.example"}).status_code
        == 400
    )


def test_backup_retains_deleted_subscription_occurrences(client, clock):
    clock[0] = date(2026, 11, 15)
    ok(sub(client), 201)
    e = ok(client.get(P + "/expenses"))["items"][0]
    ok(client.delete(f"{P}/expenses/{e['id']}?confirm=true"))
    backup = ok(client.post(P + "/backups"))
    assert backup["tables"]["subscription_occurrences"][0]["state"] == "deleted"
    ok(
        client.post(
            P + "/backups/restore", json={"confirmation": "RESTORE", "backup": backup}
        )
    )
    ok(client.post(P + "/subscriptions/process"))
    assert ok(client.get(P + "/expenses"))["total"] == 0


def test_concurrent_catchup_generates_one_occurrence(client, clock):
    clock[0] = date(2026, 11, 15)
    ok(sub(client), 201)
    clock[0] = date(2026, 12, 15)
    with ThreadPoolExecutor(max_workers=4) as executor:
        responses = list(
            executor.map(lambda _: client.post(P + "/subscriptions/process"), range(4))
        )
    assert all(r.status_code == 200 for r in responses)
    assert sum(r.json()["generated"] for r in responses) == 1
    assert ok(client.get(P + "/expenses"))["total"] == 2


def test_regular_overspending_allowed_and_warning_thresholds(client):
    ok(stipend(client), 201)
    ok(batch(client, exp("800")), 201)
    assert dash(client)["usage_percent"] == 80
    ok(batch(client, exp("300", "2026-11-11")), 201)
    assert dash(client)["remaining"] == -100


def test_thirty_days_crosses_leap_february(client, clock):
    clock[0] = date(2028, 1, 31)
    ok(sub(client, "2028-01-31"), 201)
    clock[0] = date(2028, 3, 1)
    ok(client.post(P + "/subscriptions/process"))
    assert {r["date"] for r in ok(client.get(P + "/expenses"))["items"]} == {
        "2028-01-31",
        "2028-03-01",
    }


def test_subscription_charge_edit_does_not_change_renewals(client, clock):
    clock[0] = date(2026, 11, 15)
    ok(sub(client), 201)
    e = ok(client.get(P + "/expenses"))["items"][0]
    edited = exp("150", "2026-11-15")
    edited.update(category="Subscriptions", subcategory="")
    ok(client.patch(f"{P}/expenses/{e['id']}", json=edited))
    clock[0] = date(2026, 12, 15)
    ok(client.post(P + "/subscriptions/process"))
    assert [r["amount"] for r in ok(client.get(P + "/expenses"))["items"]] == [100, 150]


def test_unpaid_first_payment_and_tracking_date_anchor(client, clock):
    clock[0] = date(2026, 11, 10)
    result = client.post(
        P + "/subscriptions",
        json={
            "name": "Plan",
            "amount": "150",
            "start_date": "2026-11-01",
            "payment_method": "UPI",
            "first_payment_made": False,
        },
    )
    ok(result, 201)
    listed = ok(client.get(P + "/subscriptions"))[0]
    assert listed["next_charge"] == "2026-12-01"
    assert listed["first_payment_status"] == "not_recorded"
    assert ok(client.get(P + "/expenses"))["total"] == 0
    clock[0] = date(2026, 11, 30)
    ok(client.post(P + "/subscriptions/process"))
    assert ok(client.get(P + "/expenses"))["total"] == 0
    clock[0] = date(2026, 12, 1)
    ok(client.post(P + "/subscriptions/process"))
    assert [e["date"] for e in ok(client.get(P + "/expenses"))["items"]] == [
        "2026-12-01"
    ]


def test_fixed_interval_preserves_legacy_processed_history(client, clock):
    clock[0] = date(2026, 11, 15)
    subscription = ok(sub(client), 201)
    backup = ok(client.post(P + "/backups"))
    expense = backup["tables"]["expenses"][0].copy()
    expense.update(id=2, date="2027-01-31")
    backup["tables"]["expenses"].append(expense)
    backup["tables"]["subscription_occurrences"].append(
        {
            "id": 2,
            "subscription_id": subscription["id"],
            "billing_date": "2027-01-31",
            "state": "generated",
            "expense_id": 2,
        }
    )
    clock[0] = date(2027, 1, 31)
    ok(
        client.post(
            P + "/backups/restore", json={"confirmation": "RESTORE", "backup": backup}
        )
    )
    ok(client.post(P + "/subscriptions/process"))
    assert {e["date"] for e in ok(client.get(P + "/expenses"))["items"]} == {
        "2026-11-15",
        "2027-01-31",
    }
    clock[0] = date(2027, 2, 13)
    ok(client.post(P + "/subscriptions/process"))
    assert ok(client.get(P + "/expenses"))["total"] == 3
    assert ok(client.get(P + "/subscriptions"))[0]["next_charge"] == "2027-03-15"
