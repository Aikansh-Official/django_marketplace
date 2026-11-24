"""Provision the three explicitly requested personal deployment test accounts once.

This is an operator-only tool, not a registration or identity-verification endpoint.
It never updates, promotes, or resets an existing user.
"""
import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import secrets
import tempfile
from urllib.parse import urlsplit

from django.contrib.auth.password_validation import validate_password
from django.db.models import Q


EXPECTED_DATABASE = 'django_marketplace'
EXPECTED_ATLAS_HOST = 'django-marketplace.brfuz1r.mongodb.net'
REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
ACCOUNTS = (
    ('aikansh', 'Aikansh', 'aikansh.admin@example.invalid', '0000000000', 'SELLER', True),
    ('12300001', 'Test Buyer', 'test.buyer@example.invalid', '0000000001', 'BUYER', False),
    ('12300002', 'Test Seller', 'test.seller@example.invalid', '0000000002', 'SELLER', False),
)


class ProvisioningError(Exception):
    pass


def _record_status(destination, document):
    """Atomically update status without risking the initial password record."""
    temporary = None
    try:
        with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=destination.parent,
                                         prefix='.account-status-', delete=False) as file:
            temporary = Path(file.name)
            json.dump(document, file, indent=2)
            file.flush()
            os.fsync(file.fileno())
        os.replace(temporary, destination)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def provision(user_model, connection, credentials_file):
    """Return created usernames; keep generated passwords in a private file only."""
    config = connection.settings_dict
    uri = urlsplit(config.get('HOST', ''))
    if (config.get('NAME') != EXPECTED_DATABASE or
            config.get('ENGINE') != 'django_mongodb_backend' or
            uri.scheme != 'mongodb+srv' or uri.hostname != EXPECTED_ATLAS_HOST):
        raise ProvisioningError('Refusing to provision outside the intended personal Atlas database.')

    destination = Path(credentials_file).resolve()
    if destination == REPOSITORY_ROOT or destination.is_relative_to(REPOSITORY_ROOT):
        raise ProvisioningError('Credentials must be saved outside the repository.')
    if destination.exists():
        raise ProvisioningError('The private credentials file already exists; it will not be overwritten.')

    # Do not write credentials or users unless this exact database is reachable/readable.
    connection.ensure_connection()
    connection.database.command('ping')
    connection.database[user_model._meta.db_table].find_one({}, {'_id': 1})
    manager = user_model._default_manager.db_manager('default')

    # Preflight all identities before creating any account. Never repurpose an existing user.
    for username, _, email, phone, _, _ in ACCOUNTS:
        if manager.filter(Q(username=username) | Q(email=email) | Q(phone_number=phone)).exists():
            raise ProvisioningError('A requested test identity already exists; no accounts were changed.')

    records = []
    for username, full_name, email, phone, role, admin in ACCOUNTS:
        password = secrets.token_urlsafe(32) + '!9'
        candidate = user_model(username=username, email=email, full_name=full_name)
        validate_password(password, user=candidate)
        records.append({
            'username': username, 'full_name': full_name, 'email': email,
            'password': password, 'created': False,
        })

    destination.parent.mkdir(parents=True, exist_ok=True)
    document = {'purpose': 'Explicitly requested deployment test accounts',
                'database': EXPECTED_DATABASE, 'accounts': records}
    # Exclusive creation avoids replacing a previous credential record. The private
    # file exists before DB writes so a partial failure cannot lose created passwords.
    descriptor = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w', encoding='utf-8') as file:
        json.dump(document, file, indent=2)
        file.flush()
        os.fsync(file.fileno())

    created = []
    for record, (_, full_name, email, phone, role, admin) in zip(records, ACCOUNTS):
        attributes = {
            'username': record['username'], 'email': email, 'password': record['password'],
            'full_name': full_name, 'phone_number': phone, 'role': role,
            'is_active': True, 'is_verified_student': False,
            'is_id_verified': role == 'SELLER' and not admin,
            'id_card_data': {
                'test_fixture': True,
                'provenance': 'Explicitly requested personal deployment test account',
                'identity_verification': 'Not performed; synthetic test fixture only',
            },
        }
        if admin:
            attributes['admin_role'] = 'SUPER_ADMIN'
            user = manager.create_superuser(**attributes)
        else:
            user = manager.create_user(**attributes)
        created.append(str(user.username))
        record['created'] = True
        _record_status(destination, document)
    return created


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    default_file = (Path.home() / '.codex' / 'private-backups' / 'django-marketplace' /
                    f'deployment-test-accounts-{datetime.now():%Y%m%d-%H%M%S-%f}.json')
    parser.add_argument('--credentials-file', type=Path, default=default_file)
    args = parser.parse_args()
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
    try:
        import django
        django.setup()
        from django.contrib.auth import get_user_model
        from django.db import connections
        provision(get_user_model(), connections['default'], args.credentials_file)
    except ProvisioningError as error:
        parser.exit(1, f'{error}\n')
    except Exception:
        # Drivers/validation failures may include sensitive data. Do not print tracebacks.
        parser.exit(1, 'Provisioning did not complete. Existing accounts were not reset. Check the intended database and private credential record before retrying.\n')
    print('Created the three requested test accounts. Credentials were saved privately outside the repository.')


if __name__ == '__main__':
    main()
