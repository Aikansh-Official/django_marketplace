from django.apps import AppConfig


class MarketplaceConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'marketplace'

    def ready(self):
        import marketplace.signals  # noqa: F401
