import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import MagicMock, patch

from provision_demo_accounts import (
    EXPECTED_ATLAS_HOST, ProvisioningError, REPOSITORY_ROOT, provision,
)


class ProvisionDemoAccountsTests(unittest.TestCase):
    def setUp(self):
        self.temporary = TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.file = Path(self.temporary.name) / 'private' / 'accounts.json'
        self.connection = MagicMock()
        self.connection.settings_dict = {
            'NAME': 'django_marketplace', 'ENGINE': 'django_mongodb_backend',
            'HOST': f'mongodb+srv://test-only@{EXPECTED_ATLAS_HOST}/django_marketplace',
        }
        self.user_model = MagicMock()
        self.manager = self.user_model._default_manager.db_manager.return_value
        self.manager.filter.return_value.exists.return_value = False
        self.manager.create_superuser.side_effect = lambda **values: MagicMock(username=values['username'])
        self.manager.create_user.side_effect = lambda **values: MagicMock(username=values['username'])
        self.password_validation = patch('provision_demo_accounts.validate_password')
        self.validator = self.password_validation.start()
        self.addCleanup(self.password_validation.stop)

    def test_wrong_database_or_host_never_connects_or_writes(self):
        for key, value in [('NAME', 'someone_else'), ('HOST', 'mongodb://localhost/django_marketplace')]:
            original = self.connection.settings_dict[key]
            self.connection.settings_dict[key] = value
            with self.assertRaises(ProvisioningError):
                provision(self.user_model, self.connection, self.file)
            self.connection.ensure_connection.assert_not_called()
            self.connection.settings_dict[key] = original
        self.assertFalse(self.file.exists())

    def test_unreachable_or_unreadable_database_does_not_create_users(self):
        self.connection.database.__getitem__.return_value.find_one.side_effect = RuntimeError('test read failure')
        with self.assertRaises(RuntimeError):
            provision(self.user_model, self.connection, self.file)
        self.assertFalse(self.file.exists())
        self.manager.create_user.assert_not_called()
        self.manager.create_superuser.assert_not_called()

    def test_existing_identity_cannot_be_overwritten_or_promoted(self):
        self.manager.filter.return_value.exists.return_value = True
        with self.assertRaises(ProvisioningError):
            provision(self.user_model, self.connection, self.file)
        self.assertFalse(self.file.exists())
        self.manager.create_user.assert_not_called()
        self.manager.create_superuser.assert_not_called()

    def test_private_credentials_stay_outside_repository_and_are_not_replaced(self):
        with self.assertRaises(ProvisioningError):
            provision(self.user_model, self.connection, REPOSITORY_ROOT / 'test-credentials.json')
        self.file.parent.mkdir()
        self.file.write_text('original private record')
        with self.assertRaises(ProvisioningError):
            provision(self.user_model, self.connection, self.file)
        self.assertEqual(self.file.read_text(), 'original private record')

    def test_creates_named_roles_with_unique_passwords_and_explicit_fixture_provenance(self):
        created = provision(self.user_model, self.connection, self.file)
        self.assertEqual(created, ['aikansh', '12300001', '12300002'])
        self.connection.database.command.assert_called_once_with('ping')
        self.connection.database.__getitem__.return_value.find_one.assert_called_once_with({}, {'_id': 1})
        admin = self.manager.create_superuser.call_args.kwargs
        buyer, seller = [call.kwargs for call in self.manager.create_user.call_args_list]
        self.assertEqual(admin['full_name'], 'Aikansh')
        self.assertEqual(admin['admin_role'], 'SUPER_ADMIN')
        self.assertEqual((buyer['full_name'], buyer['role'], buyer['is_id_verified']), ('Test Buyer', 'BUYER', False))
        self.assertEqual((seller['full_name'], seller['role'], seller['is_id_verified']), ('Test Seller', 'SELLER', True))
        self.assertTrue(seller['id_card_data']['test_fixture'])
        self.assertIn('Not performed', seller['id_card_data']['identity_verification'])
        document = json.loads(self.file.read_text())
        passwords = [account['password'] for account in document['accounts']]
        self.assertEqual(len(set(passwords)), 3)
        self.assertTrue(all(len(password) >= 40 for password in passwords))
        self.assertTrue(all(account['created'] for account in document['accounts']))
        self.assertEqual(self.validator.call_count, 3)

    def test_partial_failure_preserves_generated_credentials_without_changing_existing_users(self):
        self.manager.create_user.side_effect = RuntimeError('test creation failure')
        with self.assertRaises(RuntimeError):
            provision(self.user_model, self.connection, self.file)
        records = json.loads(self.file.read_text())['accounts']
        self.assertEqual(len(records), 3)
        self.assertTrue(all(record['password'] for record in records))
        self.assertTrue(records[0]['created'])
        self.assertFalse(records[1]['created'])
        self.manager.create_superuser.assert_called_once()

    def test_status_write_failure_keeps_original_private_password_record(self):
        with patch('provision_demo_accounts.os.replace', side_effect=OSError('test disk failure')):
            with self.assertRaises(OSError):
                provision(self.user_model, self.connection, self.file)
        records = json.loads(self.file.read_text())['accounts']
        self.assertEqual(len(records), 3)
        self.assertTrue(all(record['password'] for record in records))
        self.assertEqual(list(self.file.parent.glob('.account-status-*')), [])


if __name__ == '__main__':
    unittest.main()
