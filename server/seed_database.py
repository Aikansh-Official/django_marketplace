import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from marketplace.models import Category, PlatformSetting

def seed():
    print("Ensuring standard categories and platform settings exist...")

    # 1. Ensure categories exist with appropriate Lucide icons
    category_data = [
        ('Books & Notes', 'books-notes', 'BookOpen'),
        ('Laptops & Computers', 'laptops-computers', 'Laptop'),
        ('Mobiles & Electronics', 'mobiles-electronics', 'Smartphone'),
        ('Hostel & Room Essentials', 'hostel-room-essentials', 'Home'),
        ('Fashion & Lifestyle', 'fashion-lifestyle', 'Shirt'),
        ('Stationery & Lab Gear', 'stationery-lab-gear', 'PenTool'),
        ('Sports & Fitness', 'sports-fitness', 'Dumbbell'),
        ('Others', 'others', 'Package'),
    ]

    for name, slug, icon in category_data:
        Category.objects.update_or_create(
            slug=slug,
            defaults={'name': name, 'icon': icon}
        )

    print("Verified categories.")

    # 2. Platform Settings
    PlatformSetting.objects.update_or_create(
        key='maintenance_mode',
        defaults={'value': 'false'}
    )
    PlatformSetting.objects.update_or_create(
        key='allow_registrations',
        defaults={'value': 'true'}
    )
    PlatformSetting.objects.update_or_create(
        key='allowed_domains',
        defaults={'value': ''}
    )
    print("Verified platform settings.")

    # 3. Ensure Default Superadmin Exists
    from django.contrib.auth import get_user_model
    User = get_user_model()
    admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
    admin_email = os.environ.get('ADMIN_EMAIL', 'admin@campusxchange.com')
    admin_password = os.environ.get('ADMIN_PASSWORD', 'Admin@123456')

    admin_user, created = User.objects.get_or_create(
        username=admin_username,
        defaults={
            'email': admin_email,
            'full_name': 'Campus Super Admin',
            'is_staff': True,
            'is_superuser': True,
            'role': 'SELLER',
            'admin_role': 'SUPER_ADMIN',
            'is_verified_student': True,
            'trust_score': 100
        }
    )
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.admin_role = 'SUPER_ADMIN'
    admin_user.set_password(admin_password)
    admin_user.save()

    status_str = "Created new" if created else "Updated existing"
    print(f"{status_str} superadmin user:")
    print(f"   - Username: {admin_username}")
    print(f"   - Email: {admin_email}")
    print(f"   - Password: {admin_password}")
    print(f"   - Role: SUPER_ADMIN")
    print("Database seeding completed successfully!")

if __name__ == '__main__':
    seed()
