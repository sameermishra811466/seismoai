import requests
from datetime import datetime

USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson"

def fetch_usgs_events():
    try:
        res = requests.get(USGS_URL, timeout=10)
        res.raise_for_status()
        data = res.json()

        events = []

        for f in data.get("features", []):
            props = f.get("properties", {})
            geom = f.get("geometry", {})
            coords = geom.get("coordinates", [])

            if not coords or props.get("mag") is None:
                continue

            events.append({
                "time": datetime.utcfromtimestamp(props["time"] / 1000),
                "latitude": coords[1],
                "longitude": coords[0],
                "depth": coords[2],
                "magnitude": props["mag"],
                "region": props.get("place", "Unknown"),
                "rms": 0.3,
                "gap": 80,
                "dmin": 0.5,
                "nst": 20,
            })

        print(f"Fetched {len(events)} USGS events")

        return events

    except Exception as e:
        print("USGS fetch error:", e)
        return []