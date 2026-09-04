import os
import django
import sys

# Set up Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

email = 'admin@lputrade.com'
username = 'admin'
password = 'adminpassword123'

if not User.objects.filter(username=username).exists():
    user = User.objects.create_superuser(
        username=username,
        email=email,
        password=password
    )
    # Also set is_staff=True if not already set by create_superuser
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print("Superuser created successfully.")
else:
    # Update password just in case
    user = User.objects.get(username=username)
    user.set_password(password)
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print("Superuser updated successfully.")
