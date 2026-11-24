from django.apps import AppConfig


class MarketplaceConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'marketplace'

    def ready(self):
        import marketplace.signals  # noqa: F401
        try:
            from .services.notification_service import get_firebase_app
            get_firebase_app()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Error in eager Firebase init: {e}")
