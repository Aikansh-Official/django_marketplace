# CampusXChange (LPUTrade) — Backend Server

Please refer to the comprehensive server documentation and run guide located at:
👉 **[`SERVER_ARCHITECTURE_AND_SETUP.md`](../SERVER_ARCHITECTURE_AND_SETUP.md)**

For a personal cloud database, see [MongoDB Atlas setup](../docs/ATLAS_SETUP.md).

### Quick Start
```bash
# 1. Activate Virtual Environment
.\venv\Scripts\Activate.ps1    # On Windows, from the repository root
cd server

# 2. Install dependencies
pip install -r requirements.txt

# 3. Migrate and Seed
python manage.py migrate
python seed_database.py

# 4. Start Server
python manage.py runserver 8000
```
