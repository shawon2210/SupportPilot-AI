"""SupportPilot AI — Email Service

Handles outbound email sending via SMTP and AI-drafted reply generation.
"""

from __future__ import annotations

import logging
import smtplib
from email.mime.text import MIMEText
from email.utils import formataddr, parseaddr

from app.config import get_settings

logger = logging.getLogger("supportpilot.email")


class EmailService:
    """Lightweight SMTP email sender. No-op when SMTP_HOST is not configured."""

    def __init__(self) -> None:
        self._settings = get_settings()

    @property
    def enabled(self) -> bool:
        return bool(self._settings.SMTP_HOST)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        *,
        to_name: str | None = None,
        reply_to: str | None = None,
    ) -> bool:
        """Send a plain-text email via SMTP. Returns True on success."""
        if not self.enabled:
            logger.warning("SMTP not configured — skipping email to %s", to_email)
            return False

        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = formataddr((self._settings.SMTP_FROM_NAME, self._settings.SMTP_FROM_EMAIL))
        msg["To"] = formataddr((to_name or to_email, to_email))
        if reply_to:
            msg["Reply-To"] = reply_to

        try:
            with smtplib.SMTP(self._settings.SMTP_HOST, self._settings.SMTP_PORT, timeout=15) as server:
                server.starttls()
                server.login(self._settings.SMTP_USER, self._settings.SMTP_PASSWORD)
                server.send_message(msg)
            logger.info("Email sent to %s — %s", to_email, subject)
            return True
        except Exception:
            logger.exception("Failed to send email to %s", to_email)
            return False

    async def draft_reply(self, original_body: str, context: str | None = None) -> str:
        """Generate an AI-drafted reply for a support email.

        Uses the MockProvider if no real AI provider is configured.
        """
        from app.ai.factory import get_provider

        system_prompt = (
            "You are a support agent drafting a reply to a customer email. "
            "Be professional, helpful, and concise. "
            "If context (knowledge base excerpts) is provided, use it to answer accurately."
        )
        user_prompt = f"Customer email:\n{original_body}\n"
        if context:
            user_prompt += f"\nKnowledge base context:\n{context}\n"
        user_prompt += "\nDraft a reply:"

        provider = get_provider()
        response = await provider.generate_response(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.get("content", "")

    @staticmethod
    def parse_inbound_email(raw_body: str) -> dict:
        """Parse a raw email body into sender, subject, and body.

        This is a simplified parser for development. For production,
        use something like mailparser or an SES/SendGrid webhook.
        """
        lines = raw_body.strip().split("\n")
        sender = ""
        subject = ""
        body_start = 0
        for i, line in enumerate(lines):
            low = line.lower()
            if low.startswith("from:") and not sender:
                sender = line.split(":", 1)[1].strip()
            elif low.startswith("subject:") and not subject:
                subject = line.split(":", 1)[1].strip()
            elif low.strip() == "":
                body_start = i + 1
                break

        body = "\n".join(lines[body_start:]).strip()
        # Extract email address from "Name <email>" format
        _, sender_addr = parseaddr(sender)
        return {
            "sender": sender_addr or sender,
            "subject": subject or "Untitled",
            "body": body,
        }
