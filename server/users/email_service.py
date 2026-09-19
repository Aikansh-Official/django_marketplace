import os
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

# Brand Tokens matching CampusXChange
BRAND_ORANGE = "#FB5607"
BRAND_ORANGE_HOVER = "#EA580C"
BRAND_ORANGE_BG = "#FFF7ED"
BRAND_ORANGE_BORDER = "#FFEDD5"
TEXT_DARK = "#111827"
TEXT_MUTED = "#6B7280"
BORDER_LIGHT = "#E5E7EB"
BG_PAGE = "#F9FAFB"


def _get_base_template(title: str, preheader: str, content_html: str) -> str:
    logo_url = "https://cxc.anshuman892494.online/CampusXChange_Logo.jpeg"
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
    table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
    body {{ margin: 0; padding: 0; width: 100% !important; background-color: {BG_PAGE}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
    .container {{ max-width: 540px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; border: 1px solid {BORDER_LIGHT}; overflow: hidden; }}
    .header {{ padding: 28px 32px 20px; border-bottom: 1px solid #F3F4F6; text-align: center; }}
    .content {{ padding: 32px 32px; }}
    .footer {{ padding: 20px 32px 28px; text-align: center; border-top: 1px solid #F3F4F6; background-color: #FAFAFA; }}
    .otp-box {{ background-color: {BRAND_ORANGE_BG}; border: 1px solid {BRAND_ORANGE_BORDER}; border-radius: 10px; padding: 20px 16px; text-align: center; margin: 24px 0; }}
    .otp-code {{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 800; color: {BRAND_ORANGE}; letter-spacing: 10px; padding-left: 10px; margin: 0; }}
    .btn {{ display: inline-block; background-color: {BRAND_ORANGE}; color: #FFFFFF !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; text-align: center; }}
    .note-box {{ background-color: #F9FAFB; border-left: 3px solid {BRAND_ORANGE}; border-radius: 4px; padding: 12px 14px; margin: 20px 0; }}
    @media only screen and (max-width: 560px) {{
      .container {{ border-radius: 0 !important; border: none !important; width: 100% !important; }}
      .content {{ padding: 24px 20px !important; }}
      .header {{ padding: 20px 20px 16px !important; }}
      .otp-code {{ font-size: 30px !important; letter-spacing: 6px !important; }}
    }}
  </style>
</head>
<body>
  <!-- Preheader text preview in mail clients -->
  <div style="display:none;font-size:1px;color:#333333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    {preheader}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 32px 12px; background-color: {BG_PAGE};">
    <tr>
      <td align="center">
        <table role="presentation" class="container" width="540" cellpadding="0" cellspacing="0">
          
          <!-- Simple Clean Header with Logo & Brand Name -->
          <tr>
            <td class="header">
              <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td align="center">
                    <a href="https://cxc.anshuman892494.online" target="_blank" style="text-decoration: none;">
                      <img src="{logo_url}" width="38" height="38" alt="CampusXChange" style="border-radius: 8px; vertical-align: middle; margin-right: 10px; display: inline-block; border: 1px solid #E5E7EB;" />
                      <span style="font-size: 22px; font-weight: 800; color: {TEXT_DARK}; vertical-align: middle; letter-spacing: -0.5px; display: inline-block;">Campus<span style="color: {BRAND_ORANGE};">XChange</span></span>
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 4px;">
                    <span style="font-size: 11px; color: {TEXT_MUTED}; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                      Student Marketplace &bull; LPU
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="content">
              {content_html}
            </td>
          </tr>

          <!-- Simple Footer -->
          <tr>
            <td class="footer">
              <p style="margin: 0; font-size: 12px; color: {TEXT_MUTED}; line-height: 1.6;">
                <strong>CampusXChange</strong> &bull; Peer-to-Peer Student Marketplace<br>
                Lovely Professional University, Punjab
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #9CA3AF;">
                This is an automated message. Please do not reply directly to this email.
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
    preheader = f"Your verification code is {otp_code}. Valid for 10 minutes."
    
    content = f"""
      <h1 style="font-size: 20px; font-weight: 700; color: {TEXT_DARK}; margin: 0 0 12px;">
        Verify Your Email Address
      </h1>
      <p style="font-size: 14px; line-height: 1.6; color: #4B5563; margin: 0 0 16px;">
        Hello Student,<br>
        Thank you for joining CampusXChange. Use the verification code below to verify your email address.
      </p>

      <div class="otp-box">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: {BRAND_ORANGE_HOVER}; margin-bottom: 6px;">
          Verification Code
        </div>
        <div class="otp-code">{otp_code}</div>
        <div style="font-size: 12px; color: #9A3412; margin-top: 8px; font-weight: 500;">
          Valid for 10 minutes &bull; Single-use only
        </div>
      </div>

      <div class="note-box">
        <p style="font-size: 12px; color: #4B5563; line-height: 1.5; margin: 0;">
          <strong>Security Tip:</strong> Never share this code with anyone. CampusXChange will never ask for your verification code or account password.
        </p>
      </div>

      <p style="font-size: 12px; color: {TEXT_MUTED}; margin: 20px 0 0; line-height: 1.5;">
        If you did not request this verification code, you can safely ignore this email.
      </p>
    """
    
    html = _get_base_template("Verify Your Email - CampusXChange", preheader, content)
    
    text = f"""CampusXChange - Verify Your Email Address

Hello Student,

Your verification code is: {otp_code}

This code is valid for 10 minutes.
Never share this code with anyone.

If you did not request this, please ignore this email.

CampusXChange — Student Marketplace
https://cxc.anshuman892494.online
"""
    return subject, html, text


def get_password_reset_template(reset_url: str, email: str, name: str = "") -> tuple[str, str, str]:
    """
    Returns (subject, html_content, text_content) for Password Reset
    """
    subject = "Reset your CampusXChange password"
    preheader = "We received a request to reset your CampusXChange password."
    greeting = f"Hello {name}," if name else "Hello Student,"

    content = f"""
      <h1 style="font-size: 20px; font-weight: 700; color: {TEXT_DARK}; margin: 0 0 12px;">
        Reset Your Password
      </h1>
      <p style="font-size: 14px; line-height: 1.6; color: #4B5563; margin: 0 0 16px;">
        {greeting}<br>
        We received a request to reset your password for your account associated with <strong>{email}</strong>.
      </p>

      <div style="text-align: center; margin: 26px 0;">
        <a href="{reset_url}" target="_blank" class="btn">
          Reset Password
        </a>
      </div>

      <div class="note-box">
        <p style="font-size: 12px; color: #4B5563; line-height: 1.5; margin: 0;">
          <strong>Note:</strong> This link is valid for <strong>15 minutes</strong> and can only be used once.
        </p>
      </div>

      <p style="font-size: 12px; color: {TEXT_MUTED}; margin: 20px 0 6px; line-height: 1.5;">
        If the button above does not work, copy and paste this URL into your browser:
      </p>
      <p style="background: #F3F4F6; padding: 10px 12px; border-radius: 6px; font-size: 11px; word-break: break-all; color: #374151; font-family: ui-monospace, monospace; margin: 0;">
        {reset_url}
      </p>

      <p style="font-size: 12px; color: {TEXT_MUTED}; margin: 20px 0 0; line-height: 1.5;">
        If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
    """
    
    html = _get_base_template("Reset Your Password - CampusXChange", preheader, content)
    
    text = f"""CampusXChange - Reset Your Password

{greeting}

We received a request to reset your CampusXChange account password.

Open the link below to set a new password (valid for 15 minutes):
{reset_url}

If you did not request this, please ignore this email.

CampusXChange — Student Marketplace
https://cxc.anshuman892494.online
"""
    return subject, html, text


def get_welcome_email_template(name: str, email: str) -> tuple[str, str, str]:
    """
    Returns (subject, html_content, text_content) for Welcome Email
    """
    subject = "Welcome to CampusXChange! 🎓"
    preheader = "Your student account is verified. Start exploring campus deals."
    display_name = name or "Student"
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://cxc.anshuman892494.online')

    content = f"""
      <h1 style="font-size: 20px; font-weight: 700; color: {TEXT_DARK}; margin: 0 0 12px;">
        Welcome to CampusXChange, {display_name}! 🎉
      </h1>
      <p style="font-size: 14px; line-height: 1.6; color: #4B5563; margin: 0 0 16px;">
        Your student account is now verified and active. You are part of your campus's official student-to-student marketplace.
      </p>

      <div style="background-color: #FAFAFA; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px 18px; margin: 20px 0;">
        <p style="font-size: 13px; font-weight: 700; color: {TEXT_DARK}; margin: 0 0 8px;">What you can do on CampusXChange:</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #4B5563; line-height: 1.7;">
          <li><strong>Buy & Sell Course Books:</strong> Textbooks, notes & lab coats from seniors.</li>
          <li><strong>Campus Essentials:</strong> Cycles, kettles, electronics & room gear.</li>
          <li><strong>Safe In-Campus Handovers:</strong> Verified student IDs & trust scores.</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 26px 0;">
        <a href="{frontend_url}" target="_blank" class="btn">
          Explore Campus Deals
        </a>
      </div>
    """
    
    html = _get_base_template("Welcome to CampusXChange!", preheader, content)
    
    text = f"""Welcome to CampusXChange, {display_name}!

Your student account is active.
Visit {frontend_url} to explore course books, electronics, and hostel essentials.

Happy trading,
The CampusXChange Team
"""
    return subject, html, text


def send_email_via_resend(to_email: str, subject: str, html_content: str, text_content: str) -> dict:
    """
    Dispatches email using Resend API.
    """
    api_key = getattr(settings, 'RESEND_API_KEY', '') or os.environ.get('RESEND_API_KEY', '')
    from_email = getattr(settings, 'RESEND_FROM_EMAIL', '') or os.environ.get('RESEND_FROM_EMAIL', 'CampusXChange <noreply@cxc.anshuman892494.online>')

    if not api_key or api_key.strip() == '' or 'your_resend_api_key' in api_key.lower():
        logger.warning(f"[RESEND NOT CONFIGURED] Email to {to_email} with subject '{subject}' logged to console.")
        if settings.DEBUG:
            print(f"\n==================== [DEV RESEND EMAIL TO: {to_email}] ====================")
            print(f"Subject: {subject}")
            print(f"From: {from_email}")
            print(text_content)
            print("========================================================================\n")
        return {"success": True, "mock": True, "message": "Email logged.", "id": "mock_delivery"}

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
        return {"success": True, "mock": False, "id": email_id, "message": "Email sent successfully via Resend."}
    except Exception as e:
        logger.exception(f"Failed to send email to {to_email} via Resend: {str(e)}")
        return {"success": False, "mock": False, "error": str(e)}


def send_otp_email(to_email: str, otp_code: str) -> dict:
    subject, html, text = get_otp_email_template(otp_code, to_email)
    return send_email_via_resend(to_email, subject, html, text)


def send_password_reset_email(to_email: str, reset_url: str, name: str = "") -> dict:
    subject, html, text = get_password_reset_template(reset_url, to_email, name)
    return send_email_via_resend(to_email, subject, html, text)


def send_welcome_email(to_email: str, name: str = "") -> dict:
    subject, html, text = get_welcome_email_template(name, to_email)
    return send_email_via_resend(to_email, subject, html, text)
