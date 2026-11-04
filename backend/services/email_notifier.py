"""
FieldSight — Transactional Email Alert Service
Dispatches risk alert emails upon video intelligence completion.
Uses Resend REST API when RESEND_API_KEY is present; gracefully logs otherwise.
"""
import logging
import httpx
from typing import List, Optional
from config import settings
from db.models import Event, Summary

logger = logging.getLogger("fieldsight.email")

def _get_severity_order(level: str) -> int:
    orders = {"critical": 4, "high": 3, "medium": 2, "low": 1}
    return orders.get(level.lower(), 0)

def _build_html_email(
    job_id: str,
    filename: str,
    events: List[Event],
    summary: Summary,
    results_url: str
) -> str:
    critical_count = summary.by_risk.get("critical", 0)
    high_count = summary.by_risk.get("high", 0)
    medium_count = summary.by_risk.get("medium", 0)
    total_events = summary.total_events

    # Sort to find most severe event
    sorted_events = sorted(events, key=lambda e: _get_severity_order(e.risk_level), reverse=True)
    most_severe = sorted_events[0] if sorted_events else None

    most_severe_html = ""
    if most_severe:
        risk_color = "#DC2626" if most_severe.risk_level == "critical" else "#EA580C" if most_severe.risk_level == "high" else "#D97706"
        most_severe_html = f"""
        <div style="background: #FFFFFF; border: 1px solid #E5E5E2; border-left: 4px solid {risk_color}; border-radius: 4px; padding: 16px; margin: 20px 0;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: {risk_color}; font-weight: bold;">
              [{most_severe.risk_level.upper()} RISK] Primary Incident
            </span>
            <span style="font-family: monospace; font-size: 11px; color: #6B6B66;">
              {most_severe.timestamp_start:.1f}s – {most_severe.timestamp_end:.1f}s
            </span>
          </div>
          <div style="font-size: 15px; font-weight: 600; color: #1A1A18; margin-bottom: 6px;">
            {most_severe.behaviour_label}
          </div>
          <p style="font-size: 13px; color: #4B5563; line-height: 1.5; margin: 0 0 10px 0;">
            {most_severe.explanation}
          </p>
          <div style="font-size: 12px; color: #6B6B66; background: #F7F7F5; padding: 8px 10px; border-radius: 3px;">
            <strong style="color: #1A1A18;">Expected Practice:</strong> {most_severe.expected_practice}
          </div>
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>FieldSight Risk Alert</title>
      </head>
      <body style="background-color: #F7F7F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 30px 15px; color: #1A1A18;">
        <div style="max-width: 580px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E5E2; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <div style="background: #FFFFFF; border-bottom: 1px solid #E5E5E2; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-family: monospace; font-weight: 700; font-size: 16px; letter-spacing: 1px; color: #1A1A18;">
                FIELDSIGHT <span style="color: #2563EB; font-size: 12px; font-weight: normal; margin-left: 6px;">AI Video Intelligence</span>
              </div>
              <div style="font-size: 11px; font-family: monospace; color: #6B6B66; margin-top: 3px;">
                Warehouse Operations Risk Dispatch
              </div>
            </div>
          </div>

          <!-- Main Content -->
          <div style="padding: 24px;">
            <h2 style="font-size: 20px; font-weight: 600; color: #1A1A18; margin: 0 0 10px 0;">
              Handling Risk Analysis Complete
            </h2>
            <p style="font-size: 14px; color: #4B5563; line-height: 1.5; margin: 0 0 20px 0;">
              FieldSight completed sequence classification for <strong>{filename}</strong>. Computer vision models identified <span style="color: {'#DC2626' if critical_count + high_count > 0 else '#1A1A18'}; font-weight: 600;">{total_events} events</span> flagged for supervisory review.
            </p>

            <!-- Metrics Grid -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: center;">
              <tr>
                <td style="background: #FEF2F2; border: 1px solid #FECACA; padding: 12px; border-radius: 4px; width: 25%;">
                  <div style="font-family: monospace; font-size: 10px; color: #991B1B; text-transform: uppercase;">Critical</div>
                  <div style="font-size: 22px; font-weight: 700; color: #DC2626; font-family: monospace;">{critical_count}</div>
                </td>
                <td style="width: 2%;"></td>
                <td style="background: #FFF7ED; border: 1px solid #FED7AA; padding: 12px; border-radius: 4px; width: 25%;">
                  <div style="font-family: monospace; font-size: 10px; color: #9A3412; text-transform: uppercase;">High</div>
                  <div style="font-size: 22px; font-weight: 700; color: #EA580C; font-family: monospace;">{high_count}</div>
                </td>
                <td style="width: 2%;"></td>
                <td style="background: #FFFBEB; border: 1px solid #FDE68A; padding: 12px; border-radius: 4px; width: 25%;">
                  <div style="font-family: monospace; font-size: 10px; color: #92400E; text-transform: uppercase;">Medium</div>
                  <div style="font-size: 22px; font-weight: 700; color: #D97706; font-family: monospace;">{medium_count}</div>
                </td>
                <td style="width: 2%;"></td>
                <td style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 12px; border-radius: 4px; width: 25%;">
                  <div style="font-family: monospace; font-size: 10px; color: #1E40AF; text-transform: uppercase;">Prevented</div>
                  <div style="font-size: 22px; font-weight: 700; color: #2563EB; font-family: monospace;">{summary.events_prevented_estimate}</div>
                </td>
              </tr>
            </table>

            <!-- Most Severe Highlight -->
            {most_severe_html}

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0 20px 0;">
              <a href="{results_url}" style="background-color: #2563EB; color: #FFFFFF; font-size: 14px; font-weight: 500; text-decoration: none; padding: 12px 28px; border-radius: 4px; display: inline-block; font-family: monospace;">
                View Interactive Video Analysis &rarr;
              </a>
            </div>

            <p style="font-size: 12px; color: #9CA3AF; text-align: center; margin: 0;">
              Direct dashboard link: <a href="{results_url}" style="color: #2563EB; text-decoration: underline;">{results_url}</a>
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #F7F7F5; border-top: 1px solid #E5E5E2; padding: 16px 24px; font-size: 11px; color: #6B6B66; line-height: 1.5;">
            <p style="margin: 0 0 6px 0;">
              <strong>Responsible AI Notice:</strong> FieldSight flags handling behaviour for process improvement and damage prevention, not employee punishment. Detections represent observed behaviour and potential risk requiring human supervisor review.
            </p>
            <div style="font-family: monospace; color: #9B9B96;">
              FieldSight &copy; 2025 &middot; Automated Risk Notification Dispatch
            </div>
          </div>
        </div>
      </body>
    </html>
    """

def _build_text_email(
    job_id: str,
    filename: str,
    events: List[Event],
    summary: Summary,
    results_url: str
) -> str:
    critical_count = summary.by_risk.get("critical", 0)
    high_count = summary.by_risk.get("high", 0)
    sorted_events = sorted(events, key=lambda e: _get_severity_order(e.risk_level), reverse=True)
    most_severe = sorted_events[0] if sorted_events else None

    lines = [
        "==================================================",
        "FIELDSIGHT — WAREHOUSE HANDLING RISK ALERT",
        "==================================================",
        f"Footage: {filename}",
        f"Total Events Caught: {summary.total_events}",
        f"Breakdown: Critical: {critical_count}, High: {high_count}, Medium: {summary.by_risk.get('medium', 0)}",
        f"Estimated Events Prevented: {summary.events_prevented_estimate}",
        "",
    ]
    if most_severe:
        lines.extend([
            f"PRIMARY INCIDENT: [{most_severe.risk_level.upper()}] {most_severe.behaviour_label}",
            f"Time: {most_severe.timestamp_start:.1f}s – {most_severe.timestamp_end:.1f}s",
            f"Explanation: {most_severe.explanation}",
            f"Expected Practice: {most_severe.expected_practice}",
            "",
        ])
    lines.extend([
        "View full interactive report and ask AI Supervisor questions:",
        results_url,
        "",
        "Responsible AI Notice: FieldSight flags handling behaviour for process improvement.",
        "Detections represent observed behaviour and potential risk requiring human review.",
        "=================================================="
    ])
    return "\n".join(lines)


async def send_risk_alert_email(
    job_id: str,
    alert_email: Optional[str],
    filename: str,
    events: List[Event],
    summary: Summary
) -> bool:
    """
    Sends risk alert email to alert_email.
    If RESEND_API_KEY is configured: dispatches via Resend API.
    Otherwise: logs the simulated email clearly to console/logs for demo.
    Never throws an uncaught exception so processing is never blocked.
    """
    if not alert_email or not alert_email.strip() or "@" not in alert_email:
        logger.info(f"[email] No alert_email configured for job {job_id} — skipping dispatch.")
        return False

    alert_email = alert_email.strip()
    critical_count = summary.by_risk.get("critical", 0)
    high_count = summary.by_risk.get("high", 0)
    high_risk_total = critical_count + high_count

    if high_risk_total > 0:
        subject = f"FieldSight — {high_risk_total} high-risk event{'s' if high_risk_total > 1 else ''} flagged in {filename}"
    else:
        subject = f"FieldSight — Risk report ready for {filename}"

    frontend_base = settings.FRONTEND_URL.rstrip("/")
    results_url = f"{frontend_base}/analyze/{job_id}"

    html_content = _build_html_email(job_id, filename, events, summary, results_url)
    text_content = _build_text_email(job_id, filename, events, summary, results_url)

    api_key = settings.RESEND_API_KEY.strip()

    if api_key:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resend_payload = {
                    "from": "FieldSight Alerts <onboarding@resend.dev>",
                    "to": [alert_email],
                    "subject": subject,
                    "html": html_content,
                    "text": text_content,
                }
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                }
                resp = await client.post("https://api.resend.com/emails", json=resend_payload, headers=headers)
                if resp.status_code in (200, 201):
                    data = resp.json()
                    logger.info(f"[email] ✅ Real email alert dispatched to {alert_email} via Resend (ID: {data.get('id')})")
                    print(f"[email] ✅ Real email alert dispatched to {alert_email} via Resend (ID: {data.get('id')})")
                    return True
                else:
                    logger.warning(f"[email] ⚠️ Resend API responded with {resp.status_code}: {resp.text}")
                    print(f"[email] ⚠️ Resend API responded with {resp.status_code}: {resp.text}")
                    if resp.status_code == 403 and "testing emails" in resp.text:
                        print("[email] ℹ️ Hint: On free Resend test domains, 'to' must match your Resend account registration email.")
                    # Fallback to console simulation log
        except Exception as err:
            logger.error(f"[email] ❌ Failed to send email via Resend: {err}")
            print(f"[email] ❌ Failed to send email via Resend: {err}")

    # Graceful degradation / Local demo log:
    print("\n" + "━" * 68)
    print("  [EMAIL ALERT LOGGED — Set RESEND_API_KEY in .env to send live]")
    print(f"  To:         {alert_email}")
    print(f"  Subject:    {subject}")
    print(f"  Dashboard:  {results_url}")
    print(f"  Events:     {summary.total_events} total ({critical_count} critical, {high_count} high)")
    print("━" * 68 + "\n")
    return True
