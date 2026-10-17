import os
import smtplib
import ssl
from email.message import EmailMessage
from html import escape
from urllib.parse import quote


class EmailDeliveryError(Exception):
    """A persisted invitation or verification link could not be emailed."""


def send_email_verification(*, recipient: str, token: str) -> bool:
    """Send an account verification link through configured SMTP."""
    host = os.getenv("SMTP_HOST", "").strip()
    if not host:
        return False
    sender = os.getenv("SMTP_FROM_EMAIL", "").strip()
    if not sender:
        raise EmailDeliveryError("SMTP_FROM_EMAIL must be configured when SMTP is enabled")
    try:
        port = int(os.getenv("SMTP_PORT", "587"))
    except ValueError as exc:
        raise EmailDeliveryError("SMTP_PORT must be a valid port number") from exc
    tls_mode = os.getenv("SMTP_TLS_MODE", "starttls").strip().lower()
    if tls_mode not in {"starttls", "ssl", "none"}:
        raise EmailDeliveryError("SMTP_TLS_MODE must be starttls, ssl, or none")
    url = f"{os.getenv('APP_BASE_URL', 'http://localhost:3000').rstrip('/')}/#verify={quote(token)}"
    message = EmailMessage()
    try:
        message["Subject"] = "Verify your SmartBiz email address"
        message["From"] = sender
        message["To"] = recipient
        message.set_content(f"Verify your SmartBiz email address within 24 hours: {url}\n")
        message.add_alternative(
            "<!doctype html><html><body style='font-family:Arial,sans-serif;color:#20332d'>"
            "<h2>Verify your email address</h2><p>Confirm your email to finish setting up SmartBiz.</p>"
            f"<p><a href=\"{escape(url, quote=True)}\">Verify email address</a></p>"
            "<p>This link expires in 24 hours and can be used once.</p></body></html>",
            subtype="html",
        )
    except (ValueError, TypeError) as exc:
        raise EmailDeliveryError("Email verification configuration is invalid") from exc
    username, password = os.getenv("SMTP_USERNAME", ""), os.getenv("SMTP_PASSWORD", "")
    context = ssl.create_default_context()
    try:
        if tls_mode == "ssl":
            with smtplib.SMTP_SSL(host, port, context=context, timeout=15) as client:
                if username:
                    client.login(username, password)
                client.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=15) as client:
                client.ehlo()
                if tls_mode == "starttls":
                    client.starttls(context=context)
                    client.ehlo()
                if username:
                    client.login(username, password)
                client.send_message(message)
    except (OSError, smtplib.SMTPException, ValueError) as exc:
        raise EmailDeliveryError("SMTP could not deliver the verification email") from exc
    return True


def send_business_invitation(
    *,
    recipient: str,
    business_name: str,
    role: str,
    token: str,
    expires_at: str,
) -> bool:
    """Send an invitation through configured SMTP; return False in manual mode."""
    host = os.getenv("SMTP_HOST", "").strip()
    if not host:
        return False

    sender = os.getenv("SMTP_FROM_EMAIL", "").strip()
    if not sender:
        raise EmailDeliveryError("SMTP_FROM_EMAIL must be configured when SMTP is enabled")

    try:
        port = int(os.getenv("SMTP_PORT", "587"))
    except ValueError as exc:
        raise EmailDeliveryError("SMTP_PORT must be a valid port number") from exc

    tls_mode = os.getenv("SMTP_TLS_MODE", "starttls").strip().lower()
    if tls_mode not in {"starttls", "ssl", "none"}:
        raise EmailDeliveryError("SMTP_TLS_MODE must be starttls, ssl, or none")

    app_base_url = os.getenv("APP_BASE_URL", "http://localhost:3000").rstrip("/")
    invitation_url = f"{app_base_url}/#token={quote(token)}"
    clean_business_name = " ".join(business_name.split())
    safe_business = escape(clean_business_name)
    safe_role = escape(role)
    safe_url = escape(invitation_url, quote=True)
    message = EmailMessage()
    try:
        message["Subject"] = f"You're invited to join {clean_business_name} on SmartBiz"
        message["From"] = sender
        message["To"] = recipient
        message.set_content(
            f"You've been invited to join {clean_business_name} on SmartBiz as a {role}.\n\n"
            f"Accept the invitation within seven days: {invitation_url}\n\n"
            "Sign in or create an account using this email address. The invitation link will connect your account to the business.\n"
            f"Invitation expires: {expires_at}.\n"
        )
        message.add_alternative(
            "<!doctype html><html><body style='font-family:Arial,sans-serif;color:#20332d'>"
            f"<h2>Join {safe_business} on SmartBiz</h2>"
            f"<p>You've been invited to join as a <strong>{safe_role}</strong>.</p>"
            f"<p><a href=\"{safe_url}\" style='display:inline-block;padding:12px 18px;background:#17845c;color:#fff;text-decoration:none;border-radius:6px'>"
            "Accept invitation</a></p>"
            "<p>Sign in or create an account using this email address. This invitation link can be used once.</p>"
            f"<p style='color:#718078;font-size:12px'>Expires {escape(expires_at)}.</p>"
            "</body></html>",
            subtype="html",
        )
    except (ValueError, TypeError) as exc:
        raise EmailDeliveryError("Invitation email configuration is invalid") from exc

    username = os.getenv("SMTP_USERNAME", "")
    password = os.getenv("SMTP_PASSWORD", "")
    context = ssl.create_default_context()
    try:
        if tls_mode == "ssl":
            with smtplib.SMTP_SSL(host, port, context=context, timeout=15) as client:
                if username:
                    client.login(username, password)
                client.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=15) as client:
                client.ehlo()
                if tls_mode == "starttls":
                    client.starttls(context=context)
                    client.ehlo()
                if username:
                    client.login(username, password)
                client.send_message(message)
    except (OSError, smtplib.SMTPException, ValueError) as exc:
        raise EmailDeliveryError("SMTP could not deliver the invitation") from exc
    return True
