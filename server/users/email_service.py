import os
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# Base styles & layout template
def _get_base_template(title: str, preheader: str, content_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{title}</title>
  <style>
    body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
    table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
    img {{ -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }}
    body {{ margin: 0; padding: 0; width: 100% !important; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
    .email-container {{ max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); }}
    .header-banner {{ background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%); padding: 36px 32px 32px; text-align: center; }}
    .brand-title {{ font-size: 26px; font-weight: 900; color: #FFFFFF; margin: 0; letter-spacing: -0.5px; }}
    .brand-subtitle {{ font-size: 13px; color: rgba(255, 255, 255, 0.85); margin-top: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: 1.5px; }}
    .content-area {{ padding: 36px 32px; }}
    .heading-primary {{ font-size: 22px; font-weight: 800; color: #111827; margin: 0 0 12px; }}
    .text-body {{ font-size: 15px; line-height: 1.6; color: #4B5563; margin: 0 0 20px; }}
    .otp-box {{ background: linear-gradient(180deg, #EEF2FF 0%, #E0E7FF 100%); border: 2px dashed #6366F1; border-radius: 14px; padding: 22px 16px; text-align: center; margin: 26px 0; }}
    .otp-code {{ font-family: 'SF Pro Display', 'Courier New', monospace; font-size: 36px; font-weight: 900; color: #4338CA; letter-spacing: 12px; margin: 0; padding-left: 12px; }}
    .otp-timer {{ font-size: 13px; font-weight: 600; color: #4F46E5; margin-top: 8px; }}
    .btn-primary {{ display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #FFFFFF !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 10px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35); text-align: center; }}
    .alert-card {{ background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 14px 16px; margin: 24px 0 16px; }}
    .alert-text {{ font-size: 13px; line-height: 1.5; color: #92400E; margin: 0; }}
    .footer-area {{ background-color: #F9FAFB; padding: 28px 32px; text-align: center; border-top: 1px solid #E5E7EB; }}
    .footer-text {{ font-size: 12px; color: #9CA3AF; line-height: 1.5; margin: 4px 0; }}
    .footer-links a {{ color: #6B7280; text-decoration: underline; margin: 0 8px; }}
    @media only screen and (max-width: 600px) {{
      .email-container {{ border-radius: 0 !important; width: 100% !important; }}
      .content-area {{ padding: 24px 20px !important; }}
      .otp-code {{ font-size: 28px !important; letter-spacing: 8px !important; }}
    }}
  </style>
</head>
<body>
  <!-- Hidden preheader text for preview -->
  <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    {preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0">
          <!-- Header Banner -->
          <tr>
            <td class="header-banner">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:rgba(255,255,255,0.18);border-radius:12px;padding:8px 16px;margin-bottom:12px;">
                      <span style="font-size:20px;vertical-align:middle;">🎓</span>
                      <span style="font-weight:800;color:#FFFFFF;font-size:14px;letter-spacing:1px;margin-left:6px;vertical-align:middle;">CAMPUS MARKETPLACE</span>
                    </div>
                    <h1 class="brand-title">CampusXChange</h1>
                    <div class="brand-subtitle">Smart • Safe • Student-to-Student</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="content-area">
              {content_html}
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td class="footer-area">
              <p class="footer-text" style="font-weight: 600; color: #6B7280;">CampusXChange — The Student Marketplace</p>
              <p class="footer-text">This is an automated security transmission. Please do not reply to this email.</p>
              <p class="footer-text" style="margin-top: 12px; font-size: 11px;">
                &copy; {settings.TIME_ZONE if hasattr(settings, 'TIME_ZONE') else ''} CampusXChange. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def get_otp_email_template(otp_code: str, email: str) -> tuple[str, str, str]:
    """
    Returns (subject, html_content, text_content) for OTP verification
    """
    subject = f"{otp_code} is your CampusXChange verification code"
    preheader = f"Your one-time verification code is {otp_code}. Valid for 10 minutes."
    
    content = f"""
      <h2 class="heading-primary">Verify Your Email Address</h2>
      <p class="text-body">
        Hello Student,<br><br>
        Thank you for choosing <strong>CampusXChange</strong>. Use the 6-digit one-time verification code below to verify your account registration.
      </p>

      <div class="otp-box">
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6366F1; letter-spacing: 1px; margin-bottom: 6px;">Your Verification Code</div>
        <div class="otp-code">{otp_code}</div>
        <div class="otp-timer">⏰ Valid for 10 minutes &bull; Single-use only</div>
      </div>

      <div class="alert-card">
        <p class="alert-text">
          <strong>🔒 Security Reminder:</strong> Never share this code with anyone. CampusXChange representatives will never ask you for your verification code or login password.
        </p>
      </div>

      <p class="text-body" style="font-size: 13px; color: #6B7280; margin-top: 24px;">
        If you didn't request this verification code for <strong>{email}</strong>, you can safely ignore this email. Someone may have entered your address by mistake.
      </p>
    """
    
    html = _get_base_template("Verify Your Email - CampusXChange", preheader, content)
    
    text = f"""CampusXChange - Verify Your Email Address

Hello Student,

Your 6-digit verification code is: {otp_code}

This code is valid for 10 minutes.
Never share this verification code with anyone.

If you did not request this, please ignore this email.

Best regards,
The CampusXChange Team
"""
    return subject, html, text


def get_password_reset_template(reset_url: str, email: str, name: str = "") -> tuple[str, str, str]:
    """
    Returns (subject, html_content, text_content) for Password Reset
    """
    subject = "Reset your CampusXChange password"
    preheader = "We received a request to reset your CampusXChange account password."
    greeting = f"Hello {name}," if name else "Hello Student,"

    content = f"""
      <h2 class="heading-primary">Password Reset Request</h2>
      <p class="text-body">
        {greeting}<br><br>
        We received a request to reset the password for your CampusXChange account associated with <strong>{email}</strong>.
      </p>

      <p class="text-body">
        Click the button below to choose a strong, new password:
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="{reset_url}" target="_blank" class="btn-primary">
          Reset Password &rarr;
        </a>
      </div>

      <div class="alert-card">
        <p class="alert-text">
          <strong>⏰ Time-Sensitive Link:</strong> This password reset link is valid for <strong>15 minutes</strong> and can only be used once.
        </p>
      </div>

      <p class="text-body" style="font-size: 13px; color: #6B7280; margin-top: 24px;">
        If the button above does not work, copy and paste this link into your browser:
      </p>
      <p style="background: #F3F4F6; padding: 10px 14px; border-radius: 8px; font-size: 12px; word-break: break-all; color: #4B5563; font-family: monospace;">
        {reset_url}
      </p>

      <p class="text-body" style="font-size: 13px; color: #6B7280; margin-top: 24px;">
        <strong>Didn't request this?</strong> If you didn't ask to reset your password, please ignore this email or review your account security. Your current password remains completely unchanged.
      </p>
    """
    
    html = _get_base_template("Reset Your Password - CampusXChange", preheader, content)
    
    text = f"""CampusXChange - Reset Your Password

{greeting}

We received a request to reset your CampusXChange account password.

Click or open the link below to set a new password (valid for 15 minutes):
{reset_url}

If you did not request a password reset, you can safely ignore this email.

Best regards,
The CampusXChange Security Team
"""
    return subject, html, text


def get_welcome_email_template(name: str, email: str) -> tuple[str, str, str]:
    """
    Returns (subject, html_content, text_content) for Welcome Email
    """
    subject = "Welcome to CampusXChange! 🎓 Start Trading on Campus"
    preheader = "Welcome to CampusXChange! Buy, sell and trade safely with fellow students."
    display_name = name or "Student"
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

    content = f"""
      <h2 class="heading-primary">Welcome to CampusXChange, {display_name}! 🎉</h2>
      <p class="text-body">
        Your student account has been successfully created and verified. You're now part of your campus's official peer-to-peer student marketplace.
      </p>

      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin: 24px 0;">
        <h3 style="font-size: 15px; font-weight: 700; color: #1E293B; margin: 0 0 12px;">Here's what you can do right away:</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #475569;">
              📚 <strong>Buy Course Essentials:</strong> Textbooks, lab coats, calculators & stationery from seniors.
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #475569;">
              🚲 <strong>Campus Mobility & Gear:</strong> Cycles, room essentials, kettles, monitors & gadgets.
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 14px; color: #475569;">
              🛡️ <strong>Zero Commissions:</strong> Free student-to-student transactions with verified trust scores.
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="{frontend_url}" target="_blank" class="btn-primary">
          Explore Campus Marketplace &rarr;
        </a>
      </div>

      <div class="alert-card">
        <p class="alert-text">
          <strong>💡 Pro Tip:</strong> Want to sell items? Complete your Student ID verification from your profile to earn the Verified Seller badge and unlock listing permissions.
        </p>
      </div>
    """
    
    html = _get_base_template("Welcome to CampusXChange!", preheader, content)
    
    text = f"""Welcome to CampusXChange, {display_name}!

Your student account is now verified and active.
Visit {frontend_url} to explore textbook deals, campus mobility, electronics and more.

Happy trading,
The CampusXChange Team
"""
    return subject, html, text


def send_email_via_resend(to_email: str, subject: str, html_content: str, text_content: str) -> dict:
    """
    Dispatches email using Resend API.
    Gracefully falls back if RESEND_API_KEY is not configured or in development mode.
    """
    api_key = getattr(settings, 'RESEND_API_KEY', '') or os.environ.get('RESEND_API_KEY', '')
    from_email = getattr(settings, 'RESEND_FROM_EMAIL', '') or os.environ.get('RESEND_FROM_EMAIL', 'CampusXChange <onboarding@resend.dev>')

    # Fallback / Dev Mode
    if not api_key or api_key.strip() == '' or 'your_resend_api_key' in api_key.lower():
        logger.warning(
            f"[RESEND NOT CONFIGURED] RESEND_API_KEY is missing or invalid. "
            f"Logging email to {to_email} with subject '{subject}'. "
            f"Set RESEND_API_KEY in .env to deliver real emails."
        )
        if settings.DEBUG:
            print(f"\n==================== [DEV RESEND EMAIL TO: {to_email}] ====================")
            print(f"Subject: {subject}")
            print(f"From: {from_email}")
            print(text_content)
            print("========================================================================\n")
        return {
            "success": True,
            "mock": True,
            "message": "Email logged (RESEND_API_KEY not configured).",
            "id": "mock_delivery"
        }

    try:
        import resend
        resend.api_key = api_key.strip()

        params = {
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "text": text_content,
        }

        response = resend.Emails.send(params)
        email_id = getattr(response, 'id', None) or (response.get('id') if isinstance(response, dict) else str(response))
        logger.info(f"Successfully dispatched email to {to_email} via Resend. Message ID: {email_id}")
        return {
            "success": True,
            "mock": False,
            "id": email_id,
            "message": "Email sent successfully via Resend."
        }
    except Exception as e:
        logger.exception(f"Failed to send email to {to_email} via Resend: {str(e)}")
        return {
            "success": False,
            "mock": False,
            "error": str(e)
        }


# High-level helper functions for views
def send_otp_email(to_email: str, otp_code: str) -> dict:
    subject, html, text = get_otp_email_template(otp_code, to_email)
    return send_email_via_resend(to_email, subject, html, text)


def send_password_reset_email(to_email: str, reset_url: str, name: str = "") -> dict:
    subject, html, text = get_password_reset_template(reset_url, to_email, name)
    return send_email_via_resend(to_email, subject, html, text)


def send_welcome_email(to_email: str, name: str = "") -> dict:
    subject, html, text = get_welcome_email_template(name, to_email)
    return send_email_via_resend(to_email, subject, html, text)
