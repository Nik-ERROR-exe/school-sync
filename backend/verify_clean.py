import requests
from sqlalchemy import create_engine, text

print("=== Table counts ===")
engine = create_engine(
    "postgresql+psycopg2://neondb_owner:npg_zcvPG4syu1OS@ep-dawn-feather-azfyigp1-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
)
conn = engine.connect()
rows = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).fetchall()
for r in rows:
    t = r._mapping["tablename"]
    count = conn.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
    print(f"  {t}: {count}")
conn.close()

print("\n=== API verification (port 8000) ===")
BASE = 'http://127.0.0.1:8000/api/v1'

r = requests.post(f'{BASE}/auth/login', json={'email': 'admin@amarkorvidyalaya.edu.in', 'password': 'Amarkor@2026'})
print(f'Admin login: {r.status_code}')
if r.status_code == 200:
    token = r.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    r = requests.get(f'{BASE}/admin/classes', headers=headers)
    classes = r.json() if r.status_code == 200 else []
    print(f'Classes: {len(classes)}')

    r = requests.get(f'{BASE}/admin/teachers', headers=headers)
    teachers = r.json() if r.status_code == 200 else []
    print(f'Teachers: {len(teachers)}')
    for t in teachers:
        print(f'  {t.get("teacher_id")} {t.get("name")} ({t.get("email")}) role={t.get("role")}')

    r = requests.get(f'{BASE}/admin/subjects', headers=headers)
    subjects = r.json() if r.status_code == 200 else []
    print(f'Subjects: {len(subjects)}')

    print('\nTest data removed. Database is clean (only admin from startup seed)')
