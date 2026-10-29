import hashlib
import json
from django.core.cache import cache
from rest_framework.exceptions import ValidationError, APIException
from marketplace.image_validation import normalized_data_uri
from .gemini_id_verifier import verify_student_id_with_gemini


def verification_result(image, reg_no, full_name):
    image = normalized_data_uri(image)
    identity = [image, str(reg_no).strip().lstrip('@'), str(full_name).strip()]
    key = 'verified-id:' + hashlib.sha256(json.dumps(identity).encode()).hexdigest()
    result = cache.get(key)
    if result is None:
        result = verify_student_id_with_gemini(
            image_base64=image, target_reg_no=identity[1],
            target_full_name=identity[2], target_university='Lovely Professional University',
        )
        if result.get('success') is True and result.get('is_valid') is True:
            cache.set(key, result, 600)
    return result


def require_verified_identity(image, reg_no, full_name):
    result = verification_result(image, reg_no, full_name)
    if result.get('success') is not True:
        error = APIException('Identity verification is temporarily unavailable. Please try again later.')
        error.status_code = 503
        raise error
    extracted = ''.join(c for c in str(result.get('extracted_reg_no', '')) if c.isdigit())
    if result.get('is_valid') is not True or extracted != str(reg_no).strip().lstrip('@'):
        raise ValidationError({'id_card_image': 'The ID card could not be verified against your account details.'})
    return {key: result.get(key) for key in (
        'extracted_reg_no', 'extracted_name', 'university_name', 'batch', 'valid_upto', 'program',
    )}
