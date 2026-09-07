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
        ('Cycles & Mobility', 'cycles-mobility', 'Bike'),
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
    print("Database is ready. No dummy listings, users, or offers were created.")

if __name__ == '__main__':
    seed()
