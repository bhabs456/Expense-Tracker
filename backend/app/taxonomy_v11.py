"""Frozen V1.1 catalog and historical mapping rules."""

CATEGORIES = {
    "Food & Drinks": ["Street Food, Snacks & Beverages", "Restaurants & Cafés", "Food Delivery"],
    "Groceries": ["Food Groceries", "Household Essentials"],
    "Transport": ["Metro", "Bus & Public Transport", "Taxi & Auto", "Fuel", "Vehicle Maintenance", "Parking & Tolls", "Fines & Penalties"],
    "Shopping": ["Clothing", "Footwear", "Electronics", "Accessories", "Personal Care", "Other Shopping"],
    "Entertainment": ["Movies", "Gaming", "Outings & Activities", "Events", "Other Entertainment"],
    "Education": ["Books & Study Materials", "Courses & Certifications", "Printouts & Photocopying", "Stationery"],
    "Health & Fitness": ["Medicines", "Doctor & Consultation", "Diagnostic Tests", "Fitness", "Other Health"],
    "Subscriptions": ["Streaming", "Software & Apps", "Memberships", "Other Subscriptions"],
    "Gifts & Donations": ["Gifts", "Donations"],
    "Housing & Bills": ["Rent", "Utilities", "Maintenance"],
    "Other": ["Miscellaneous"],
}

LEGACY_CATEGORIES = {
    "Food & Drinks": ["Groceries", "Food & Drinks"],
    "Transport": ["Public Transport", "Metro", "Fuel", "Taxi / Auto", "Parking", "Other"],
    "Housing": ["Rent", "Utilities", "Maintenance"],
    "Shopping": ["Clothing", "Electronics", "Personal Care", "Other"],
    "Health": ["Medicine", "Consultation", "Fitness"],
    "Education": ["Books", "Courses", "Supplies"],
    "Entertainment": ["Movies", "Games", "Outings"],
    "Subscriptions": ["Software", "Streaming", "Other"],
    "Other": ["Other"],
}

LEGACY_CATEGORIES["Food & Drinks"] += ["Meals", "Snacks", "Drinks"]
LEGACY_CATEGORIES["Transport"] += ["Taxi"]

RENAMED = {
    ("Transport", "Public Transport"): ("Transport", "Bus & Public Transport"),
    ("Transport", "Taxi"): ("Transport", "Taxi & Auto"),
    ("Transport", "Taxi / Auto"): ("Transport", "Taxi & Auto"),
    ("Transport", "Parking"): ("Transport", "Parking & Tolls"),
    ("Education", "Books"): ("Education", "Books & Study Materials"),
    ("Education", "Courses"): ("Education", "Courses & Certifications"),
    ("Health", "Medicine"): ("Health & Fitness", "Medicines"),
    ("Health", "Consultation"): ("Health & Fitness", "Doctor & Consultation"),
    ("Health", "Fitness"): ("Health & Fitness", "Fitness"),
    ("Entertainment", "Games"): ("Entertainment", "Gaming"),
    ("Entertainment", "Outings"): ("Entertainment", "Outings & Activities"),
    ("Subscriptions", "Software"): ("Subscriptions", "Software & Apps"),
    ("Food & Drinks", "Snacks"): ("Food & Drinks", "Street Food, Snacks & Beverages"),
    ("Food & Drinks", "Drinks"): ("Food & Drinks", "Street Food, Snacks & Beverages"),
}
RENAMED.update({("Housing", name): ("Housing & Bills", name)
                for name in LEGACY_CATEGORIES["Housing"]})


def key(category, subcategory):
    return category.strip().casefold(), subcategory.strip().casefold()


PAIRS = {key(category, subcategory): (category, subcategory)
         for category, subcategories in CATEGORIES.items()
         for subcategory in subcategories}
PAIRS.update({key(*old): new for old, new in RENAMED.items()})


def historical_classification(table, row):
    return PAIRS.get(key(row["category"], row["subcategory"]))


def known_historical_pair(category, subcategory):
    return any(
        category.strip().casefold() == parent.casefold()
        and (not subcategory or subcategory.strip().casefold() in
             {option.casefold() for option in options})
        for parent, options in LEGACY_CATEGORIES.items()
    ) or subcategory in CATEGORIES.get(category, ())
