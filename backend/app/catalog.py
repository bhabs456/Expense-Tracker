CATEGORIES = {
    "Food & Drinks": ["Groceries", "Food & Drinks"],
    "Transport": ["Public Transport", "Metro", "Fuel", "Taxi", "Other"],
    "Housing": ["Rent", "Utilities", "Maintenance"],
    "Shopping": ["Clothing", "Electronics", "Personal Care", "Other"],
    "Health": ["Medicine", "Consultation", "Fitness"],
    "Education": ["Books", "Courses", "Supplies"],
    "Entertainment": ["Movies", "Games", "Outings"],
    "Subscriptions": ["Software", "Streaming", "Other"],
    "Other": ["Other"],
}
PAYMENTS = ["UPI", "Cash", "Debit Card", "Credit Card", "Bank Transfer", "Other"]
SOURCES = ["Bonus", "Gift", "Other"]


def canonical_subcategory(category, subcategory):
    """Accept old records/backups while consolidating the food choices."""
    if category == "Food & Drinks" and subcategory in {"Meals", "Snacks", "Drinks"}:
        return "Food & Drinks"
    return subcategory
