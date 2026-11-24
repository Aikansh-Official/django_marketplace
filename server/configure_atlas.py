"""Verify an Atlas connection before replacing the local database settings."""
import argparse
from datetime import datetime
from pathlib import Path
import re
import shutil
from urllib.parse import quote

import certifi
from dotenv import dotenv_values, set_key
from pymongo import MongoClient
from pymongo.errors import PyMongoError


ENV_FILE = Path(__file__).resolve().parent / '.env'


def configure(host, username, database, env_file=ENV_FILE):
    if not re.fullmatch(r'[a-z0-9-]+\.[a-z0-9]+\.mongodb\.net', host):
        raise ValueError('Use the Atlas SRV hostname without a URI or path.')
    if not re.fullmatch(r'[A-Za-z0-9_-]+', database) or not username:
        raise ValueError('A username and a simple database name are required.')
    password = dotenv_values(env_file).get('ATLAS_DATABASE_PASSWORD')
    if not password or not password.strip():
        raise ValueError('ATLAS_DATABASE_PASSWORD is empty in server/.env. Settings were not changed.')
    uri = (
        f'mongodb+srv://{quote(username, safe="")}:{quote(password, safe="")}@'
        f'{host}/{database}?retryWrites=true&w=majority&appName=django_marketplace'
    )
    # Keep TLS verification enabled and verify access to the intended database.
    with MongoClient(uri, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=10000,
                     connectTimeoutMS=10000, socketTimeoutMS=10000) as client:
        client[database].command('ping')
        client[database]['django_migrations'].find_one({}, {'_id': 1})

    backup = env_file.with_name(f'.env.before-atlas-{datetime.now():%Y%m%d-%H%M%S-%f}')
    shutil.copyfile(env_file, backup)
    try:
        set_key(str(env_file), 'MONGODB_URI', uri)
        set_key(str(env_file), 'MONGODB_NAME', database)
    except Exception:
        shutil.copyfile(backup, env_file)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', required=True)
    parser.add_argument('--username', required=True)
    parser.add_argument('--database', required=True)
    args = parser.parse_args()
    try:
        configure(args.host, args.username, args.database)
    except ValueError as error:
        parser.exit(1, f'{error}\n')
    except PyMongoError:
        parser.exit(1, 'Atlas connection failed. Check the password, database permissions, IP access and network. Settings were not changed.\n')
    except OSError:
        parser.exit(1, 'Could not save the local configuration. Check file access.\n')
    print('Atlas connection verified; local database settings updated. Restart Django.')


if __name__ == '__main__':
    main()
