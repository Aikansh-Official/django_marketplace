from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password


def create_seed_admin(username, email, password):
    """Seed once; never promote an existing account or reset its password implicitly."""
    if not all((username, email, password)):
        return False
    User = get_user_model()
    if User.objects.filter(username=username).exists() or User.objects.filter(email=email).exists():
        return False
    candidate = User(username=username, email=email)
    validate_password(password, user=candidate)
    User.objects.create_superuser(username=username, email=email, password=password,
                                 full_name='Campus Super Admin', admin_role='SUPER_ADMIN', role='SELLER')
    return True
