"""
gemini_id_verifier.py
AI-Powered Student ID Card Verification Service using Google Gemini Vision API.
Extracts student credentials, checks authenticity, and cross-matches registration details.
"""

import os
import re
import base64
import logging
import json
import time
from typing import Dict, Any, Optional
from django.conf import settings
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class IdCardVerificationSchema(BaseModel):
    is_valid_id_card: bool = Field(
        description="True if the image clearly displays an authentic student ID card. False if it is not an ID card, blank, screenshot of another device, or invalid."
    )
    is_lpu_card: bool = Field(
        description="True if the ID card belongs to Lovely Professional University (LPU), containing the university name, logo, crest, or official branding."
    )
    university_name: Optional[str] = Field(
        default=None,
        description="The detected university name on the card (e.g. 'Lovely Professional University')."
    )
    extracted_reg_no: Optional[str] = Field(
        default=None,
        description="The student registration/roll number visible on the card (e.g. '12414950')."
    )
    reg_matched: bool = Field(
        description="True if the extracted registration number matches the target registration number (digits match)."
    )
    extracted_name: Optional[str] = Field(
        default=None,
        description="The student's full name printed on the ID card (e.g. 'Anshuman Varma')."
    )
    name_matched: bool = Field(
        description="True if the extracted student name closely matches the target name (ignoring casing, middle initials, or first/last ordering)."
    )
    batch: Optional[str] = Field(
        default=None,
        description="Batch or admission year if printed on the card (e.g. '2024')."
    )
    valid_upto: Optional[str] = Field(
        default=None,
        description="The validity or expiration date printed on the card (e.g. '01/07/2027')."
    )
    program: Optional[str] = Field(
        default=None,
        description="Academic program/degree if visible (e.g. 'B.Tech CSE')."
    )
    is_physical_card: bool = Field(
        description="True if this appears to be a photo of an actual physical PVC plastic student ID card."
    )
    confidence_score: float = Field(
        description="Confidence score from 0.0 to 1.0."
    )
    rejection_reason: Optional[str] = Field(
        default=None,
        description="A clear, friendly user-facing reason if validation failed, or null if valid."
    )


def _clean_base64_image(image_input: str):
    """
    Strips data URI prefix if present and returns pure bytes and mime type.
    """
    mime_type = "image/jpeg"
    clean_data = image_input.strip()

    if clean_data.startswith("data:"):
        match = re.match(r"data:([^;]+);base64,(.*)", clean_data)
        if match:
            mime_type = match.group(1)
            clean_data = match.group(2)

    image_bytes = base64.b64decode(clean_data)
    return image_bytes, mime_type


def verify_student_id_with_gemini(
    image_base64: str,
    target_reg_no: str,
    target_full_name: str,
    target_university: str = "Lovely Professional University"
) -> Dict[str, Any]:
    """
    Verifies an uploaded student ID card photo using Google Gemini Vision.
    Cross-matches the card against the provided registration number and full name.
    """
    api_key = ''
    try:
        if settings.configured:
            api_key = getattr(settings, 'GEMINI_API_KEY', '') or ''
    except Exception:
        pass
    if not api_key:
        api_key = os.environ.get('GEMINI_API_KEY', '') or ''
    if not api_key or not api_key.strip():
        try:
            from dotenv import load_dotenv
            base_dir = getattr(settings, 'BASE_DIR', None) or os.getcwd()
            env_file = os.path.join(str(base_dir), '.env')
            if os.path.exists(env_file):
                load_dotenv(env_file, override=True)
                api_key = os.environ.get('GEMINI_API_KEY', '') or ''
        except Exception:
            pass

    if not api_key or not api_key.strip():
        logger.warning("GEMINI_API_KEY is not configured in settings or environment.")
        return {
            "success": False,
            "is_valid": False,
            "error_type": "CONFIG_ERROR",
            "reason": "Gemini API key is not configured on the server. Please add GEMINI_API_KEY to server/.env."
        }

    try:
        from google import genai
        from google.genai import types

        image_bytes, mime_type = _clean_base64_image(image_base64)
        if len(image_bytes) < 500:
            return {
                "success": False,
                "is_valid": False,
                "reason": "Uploaded image file is empty or corrupted. Please capture again."
            }

        client = genai.Client(api_key=api_key.strip())

        system_instruction = (
            "You are an expert student identity verification officer and document forensics system for CampXChange. "
            "Your task is to examine the uploaded student ID card photo, extract all text fields, determine document authenticity, "
            "and cross-match the information against the user's claimed registration details.\n\n"
            "CRITERIA:\n"
            f"1. Target Registration Number: '{target_reg_no}'\n"
            f"2. Target Student Name: '{target_full_name}'\n"
            f"3. Target University: '{target_university}'\n\n"
            "RULES:\n"
            "- Check if the photo contains an official Lovely Professional University (LPU) student ID card (look for 'Lovely Professional University', 'LPU', or university logo/crest).\n"
            "- Extract the registration/roll number from the card. Compare with the target registration number. Disregard spaces or hyphens.\n"
            "- Extract the student name. Match if the names refer to the same individual (allow minor ordering differences like First Last vs Last First, or middle initial differences).\n"
            "- Check for batch year (e.g. 'Batch: 2024') and validity date (e.g. 'Valid upto: 01/07/2027').\n"
            "- Inspect for obvious manipulation, digital paint, or placeholder screenshots.\n"
            "- If all key criteria pass (is LPU card, reg matches, name matches), set is_valid_id_card = true and rejection_reason = null.\n"
            "- If any key check fails, explain clearly in rejection_reason why it failed (use clean scanning phrasing like 'Please upload a clear photo of your student ID card' or 'Registration number does not match'; do not mention AI or Gemini).\n"
        )

        prompt = (
            f"Please verify this student ID card photo.\n"
            f"Expected Registration No: {target_reg_no}\n"
            f"Expected Full Name: {target_full_name}\n"
            f"Expected University: {target_university}"
        )

        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=IdCardVerificationSchema,
            temperature=0.1,
        )

        # Configure primary model from settings/.env with priority fallbacks
        configured_model = ''
        try:
            if settings.configured:
                configured_model = getattr(settings, 'GEMINI_MODEL', '') or ''
        except Exception:
            pass
        if not configured_model:
            configured_model = os.environ.get('GEMINI_MODEL', '') or ''
        configured_model = configured_model.strip() or 'gemini-3.5-flash-lite'

        model_candidates = [configured_model]
        for fallback in ["gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-3.8-flash", "gemini-flash-latest"]:
            if fallback not in model_candidates:
                model_candidates.append(fallback)

        last_error = None

        for model_name in model_candidates:
            for attempt in range(2):
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[prompt, image_part],
                        config=config
                    )
                    if response and response.text:
                        parsed_json = json.loads(response.text)
                        
                        # Compute overall validation status
                        is_valid = bool(
                            parsed_json.get("is_valid_id_card") and
                            parsed_json.get("is_lpu_card") and
                            parsed_json.get("reg_matched") and
                            parsed_json.get("name_matched")
                        )

                        reason = parsed_json.get("rejection_reason")
                        if not is_valid and not reason:
                            if not parsed_json.get("is_lpu_card"):
                                reason = "University credentials not found. Please upload a valid LPU ID card."
                            elif not parsed_json.get("reg_matched"):
                                reason = f"Registration number does not match your account ({target_reg_no})."
                            elif not parsed_json.get("name_matched"):
                                reason = f"Student name does not match ({target_full_name})."
                            else:
                                reason = "ID card verification failed. Please upload a clearer photo."

                        return {
                            "success": True,
                            "is_valid": is_valid,
                            "reg_matched": bool(parsed_json.get("reg_matched")),
                            "name_matched": bool(parsed_json.get("name_matched")),
                            "univ_matched": bool(parsed_json.get("is_lpu_card")),
                            "extracted_reg_no": parsed_json.get("extracted_reg_no"),
                            "extracted_name": parsed_json.get("extracted_name"),
                            "university_name": parsed_json.get("university_name"),
                            "batch": parsed_json.get("batch"),
                            "valid_upto": parsed_json.get("valid_upto"),
                            "program": parsed_json.get("program"),
                            "confidence_score": parsed_json.get("confidence_score", 0.95),
                            "is_physical_card": parsed_json.get("is_physical_card", True),
                            "reason": reason,
                            "model_used": model_name
                        }
                except Exception as model_err:
                    last_error = model_err
                    if attempt == 0:
                        time.sleep(1.2)
                        continue
                    logger.warning(f"Gemini model {model_name} invocation failed (attempt {attempt+1}): {model_err}")


        logger.error(f"All Gemini models failed: {last_error}")
        return {
            "success": False,
            "is_valid": False,
            "reason": "Scanning service temporarily unavailable. Please try again."
        }

    except Exception as e:
        logger.exception(f"Unexpected error in verify_student_id_with_gemini: {e}")
        return {
            "success": False,
            "is_valid": False,
            "reason": "Verification is temporarily unavailable. Please try again later."
        }
