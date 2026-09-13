from django.contrib.admin.apps import AdminConfig
from django.contrib.auth.apps import AuthConfig
from django.contrib.contenttypes.apps import ContentTypesConfig
from rest_framework import serializers
import django_mongodb_backend.fields

from bson import ObjectId
from rest_framework.utils.encoders import JSONEncoder as DRFJSONEncoder
from django.core.serializers.json import DjangoJSONEncoder

# Register ObjectIdAutoField as CharField in DRF ModelSerializer
serializers.ModelSerializer.serializer_field_mapping[
    django_mongodb_backend.fields.ObjectIdAutoField
] = serializers.CharField

# Enable seamless JSON serialization of BSON ObjectId across DRF and Django
_orig_drf_default = DRFJSONEncoder.default
def _patched_drf_default(self, obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    return _orig_drf_default(self, obj)
DRFJSONEncoder.default = _patched_drf_default

_orig_django_default = DjangoJSONEncoder.default
def _patched_django_default(self, obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    return _orig_django_default(self, obj)
DjangoJSONEncoder.default = _patched_django_default


class MongoAdminConfig(AdminConfig):
    default_auto_field = "django_mongodb_backend.fields.ObjectIdAutoField"


class MongoAuthConfig(AuthConfig):
    default_auto_field = "django_mongodb_backend.fields.ObjectIdAutoField"


class MongoContentTypesConfig(ContentTypesConfig):
    default_auto_field = "django_mongodb_backend.fields.ObjectIdAutoField"

