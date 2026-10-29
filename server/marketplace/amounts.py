from decimal import Decimal
from rest_framework.serializers import DecimalField


def positive_offer_amount(value):
    return DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01')).run_validation(value)
