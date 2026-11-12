from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from dotenv import dotenv_values
from pymongo.errors import OperationFailure

from configure_atlas import configure


class AtlasConfigurationTests(unittest.TestCase):
    def setUp(self):
        self.directory = TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.env_file = Path(self.directory.name) / '.env'
        self.original = 'SECRET_KEY=test-only\nMONGODB_URI=mongodb://localhost/old\nMONGODB_NAME=old\n'

    def test_missing_password_leaves_configuration_untouched(self):
        self.env_file.write_text(self.original)
        with patch('configure_atlas.MongoClient') as client:
            with self.assertRaises(ValueError):
                configure('example.abc123.mongodb.net', 'test', 'test', self.env_file)
        client.assert_not_called()
        self.assertEqual(self.env_file.read_text(), self.original)

    def test_rejected_credentials_leave_configuration_untouched(self):
        original = self.original + 'ATLAS_DATABASE_PASSWORD=test-only\n'
        self.env_file.write_text(original)
        with patch('configure_atlas.MongoClient') as client:
            client.return_value.__enter__.return_value.__getitem__.return_value.command.side_effect = OperationFailure('not authorized')
            with self.assertRaises(OperationFailure):
                configure('example.abc123.mongodb.net', 'test', 'test', self.env_file)
        self.assertEqual(self.env_file.read_text(), original)

    def test_verified_connection_encodes_password_and_preserves_other_settings(self):
        self.env_file.write_text(self.original + 'ATLAS_DATABASE_PASSWORD=test@only:/#\n')
        with patch('configure_atlas.MongoClient') as client:
            configure('example.abc123.mongodb.net', 'test', 'test', self.env_file)
        uri = client.call_args.args[0]
        self.assertIn('test%40only%3A%2F%23', uri)
        values = dotenv_values(self.env_file)
        self.assertEqual(values['SECRET_KEY'], 'test-only')
        self.assertEqual(values['MONGODB_NAME'], 'test')
        self.assertEqual(values['MONGODB_URI'], uri)
        self.assertEqual(len(list(self.env_file.parent.glob('.env.before-atlas-*'))), 1)
