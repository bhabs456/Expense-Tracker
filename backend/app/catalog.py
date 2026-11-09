from .taxonomy_v11 import CATEGORIES as V11_CATEGORIES

SUBCATEGORY_RENAMES = {("Transport", "Taxi & Auto"): "Cab & Auto"}
CATEGORIES = {
    category: [
        SUBCATEGORY_RENAMES.get((category, subcategory), subcategory)
        for subcategory in subcategories
    ]
    for category, subcategories in V11_CATEGORIES.items()
}

PAYMENTS = ["UPI", "Cash", "Debit Card", "Credit Card", "Bank Transfer", "Other"]
SOURCES = ["Bonus", "Gift", "Other"]
