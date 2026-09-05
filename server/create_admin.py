import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

# Read credentials from environment variables (never hardcode!)
email = os.environ.get('ADMIN_EMAIL', '')
username = os.environ.get('ADMIN_USERNAME', '')
password = os.environ.get('ADMIN_PASSWORD', '')

if not email or not username or not password:
    print("ERROR: Set ADMIN_EMAIL, ADMIN_USERNAME, and ADMIN_PASSWORD environment variables.")
    print("Example: ADMIN_EMAIL=admin@lputrade.com ADMIN_USERNAME=admin ADMIN_PASSWORD=<strong-password> python create_admin.py")
    sys.exit(1)

if not User.objects.filter(username=username).exists():
    user = User.objects.create_superuser(
        username=username,
        email=email,
        password=password
    )
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print("Superuser created successfully.")
else:
    user = User.objects.get(username=username)
    user.set_password(password)
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print("Superuser updated successfully.")
