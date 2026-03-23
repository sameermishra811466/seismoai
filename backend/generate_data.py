import pandas as pd
import numpy as np

np.random.seed(42)
n = 6200

regions = [
    ("Pacific Ring", 30, 150, 20, 50),
    ("Himalayan Belt", 27, 82, 15, 45),
    ("Cascadia Zone", 46, -122, 10, 35),
    ("Anatolian Fault", 39, 33, 8, 30),
    ("Sumatra Fault", -3, 102, 25, 60),
    ("New Madrid Zone", 36, -89, 5, 20),
    ("Aleutian Arc", 53, -170, 30, 80),
    ("Caribbean Arc", 15, -61, 10, 40),
]

rows = []
for i in range(n):
    r = regions[i % len(regions)]
    name, base_lat, base_lng, min_depth, max_depth = r
    lat = base_lat + np.random.uniform(-5, 5)
    lng = base_lng + np.random.uniform(-5, 5)
    depth = np.random.uniform(min_depth, max_depth)
    mag = np.random.exponential(1.2) + 2.0
    mag = min(mag, 9.5)
    rows.append({
        "time": str(pd.Timestamp("2018-01-01") + pd.Timedelta(hours=int(np.random.uniform(0, 365*24*6)))),
        "latitude": round(lat, 4),
        "longitude": round(lng, 4),
        "depth": round(depth, 2),
        "magnitude": round(mag, 2),
        "region": name,
        "rms": round(np.random.uniform(0.1, 1.5), 3),
        "gap": round(np.random.uniform(20, 350), 1),
        "dmin": round(np.random.uniform(0.01, 5.0), 3),
        "nst": int(np.random.uniform(5, 120)),
        "horizontalError": round(np.random.uniform(0.1, 20), 2),
        "depthError": round(np.random.uniform(0.1, 15), 2),
        "magError": round(np.random.uniform(0.01, 0.5), 3),
        "magNst": int(np.random.uniform(3, 80)),
    })

df = pd.DataFrame(rows).sort_values("time")
df.to_csv("data/usgs_earthquakes.csv", index=False)

print(f"Generated {len(df)} records")
print("Saved to backend/data/usgs_earthquakes.csv")