import requests
import re

r = requests.get('https://pumpgrant.vercel.app/')
text = r.text
print(f"Page status: {r.status_code}")
print(f"Page size: {len(text)} bytes")

# Find all JS/CSS chunks
scripts = re.findall(r'src="(/_next/[^"]+)"', text)
styles = re.findall(r'href="(/_next/[^"]+\.css[^"]*)"', text)

print(f"\nScripts: {len(scripts)}")
for s in scripts[:10]:
    try:
        sr = requests.get(f'https://pumpgrant.vercel.app{s}', timeout=10)
        print(f"  {s[:60]}: {sr.status_code}")
    except Exception as e:
        print(f"  {s[:60]}: ERROR - {e}")

print(f"\nStyles: {len(styles)}")
for s in styles[:5]:
    try:
        sr = requests.get(f'https://pumpgrant.vercel.app{s}', timeout=10)
        print(f"  {s[:60]}: {sr.status_code}")
    except Exception as e:
        print(f"  {s[:60]}: ERROR - {e}")

# Check for error indicators in HTML
if 'Application error' in text:
    print("\n*** FOUND: Application error ***")
if '__NEXT_DATA__' in text:
    # Extract next data
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', text)
    if match:
        import json
        data = json.loads(match.group(1))
        print(f"\nNext.js build ID: {data.get('buildId', 'unknown')}")
        if 'err' in data:
            print(f"ERROR in __NEXT_DATA__: {data['err']}")

# Check deployment status
print("\n--- Checking Vercel deployment ---")
dr = requests.get('https://pumpgrant.vercel.app/api/stats')
print(f"API /stats: {dr.status_code} {dr.text[:200]}")
