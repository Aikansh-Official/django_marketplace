#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

# Configure resilient public DNS resolver to bypass local/campus Wi-Fi SRV DNS timeouts for MongoDB Atlas
try:
    import dns.resolver
    _resolver = dns.resolver.get_default_resolver()
    _resolver.nameservers = ['1.1.1.1', '8.8.8.8', '8.8.4.4', '1.0.0.1']
    _resolver.timeout = 2.0
    _resolver.lifetime = 4.0
except Exception:
    pass


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
