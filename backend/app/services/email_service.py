import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


def smtp_configured() -> bool:
    return bool(settings.SMTP_ENABLED and settings.SMTP_USER and settings.SMTP_PASSWORD)


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    if not smtp_configured():
        raise RuntimeError("SMTP non configuré")

    sender = settings.SMTP_FROM or settings.SMTP_USER
    subject = "Réinitialisation de votre mot de passe — AI Work Stress Simulator"

    text_body = f"""Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe pour AI Work Stress Simulator.

Cliquez sur ce lien (valide 1 heure) :
{reset_url}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.

— ESPRIT · AI Work Stress Simulator
"""

    html_body = f"""
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#060912;color:#e2e8f0;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#0f172a;border-radius:12px;padding:32px;border:1px solid #334155">
    <h2 style="color:#a78bfa;margin:0 0 16px">Réinitialisation du mot de passe</h2>
    <p style="color:#94a3b8;line-height:1.6">
      Vous avez demandé à réinitialiser votre mot de passe pour
      <strong style="color:#f8fafc">AI Work Stress Simulator</strong>.
    </p>
    <a href="{reset_url}"
       style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#2563eb);
              color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
      Réinitialiser mon mot de passe
    </a>
    <p style="color:#64748b;font-size:12px">Ce lien expire dans 1 heure.</p>
    <p style="color:#64748b;font-size:12px">Si vous n'avez pas fait cette demande, ignorez cet email.</p>
  </div>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(sender, [to_email], msg.as_string())
        logger.info("Email de reset envoyé à %s", to_email)
    except Exception as exc:
        logger.exception("Échec envoi email SMTP : %s", exc)
        raise
