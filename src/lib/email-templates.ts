/**
 * Email HTML templates — white-label, mobile-responsive, professional card layout.
 * No Atlas branding — entity/fund name is the sender identity.
 * Capital call emails include FULL details so LP does not need to log in.
 */

function baseLayout(entityName: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${entityName}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .header { background: #1e293b; padding: 24px 32px; }
    .header-name { color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: -0.3px; margin: 0; }
    .body { padding: 32px; }
    .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: #6b7280; margin: 0 0 4px 0; }
    .value { font-size: 15px; color: #111827; margin: 0 0 20px 0; line-height: 1.5; }
    .value-large { font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 20px 0; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .section-title { font-size: 13px; font-weight: 600; color: #374151; margin: 0 0 16px 0; }
    .footer { background: #f9fafb; padding: 20px 32px; border-top: 1px solid #e5e7eb; }
    .footer-text { font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.6; }
    @media only screen and (max-width: 600px) {
      .wrapper { margin: 0; border-radius: 0; }
      .body { padding: 24px 20px; }
      .header { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <p class="header-name">${entityName}</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p class="footer-text">This is an automated notice from ${entityName}. Please do not reply to this email. Contact your fund administrator with any questions.</p>
    </div>
  </div>
</body>
</html>`;
}

export function capitalCallEmailHtml({
  entityName,
  callNumber,
  amount,
  dueDate,
  purpose,
  wiringInstructions,
}: {
  entityName: string;
  callNumber: string;
  amount: number;
  dueDate: string;
  purpose?: string;
  wiringInstructions?: string;
}): string {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  const content = `
    <p class="label">Capital Call Notice</p>
    <p class="value-large">${formattedAmount}</p>

    <p class="label">Call Reference</p>
    <p class="value">${callNumber}</p>

    <p class="label">Payment Due Date</p>
    <p class="value">${dueDate}</p>

    ${
      purpose
        ? `<p class="label">Purpose</p>
    <p class="value">${purpose}</p>`
        : ""
    }

    ${
      wiringInstructions
        ? `<hr class="divider" />
    <p class="section-title">Wiring Instructions</p>
    <p class="value" style="white-space: pre-line;">${wiringInstructions}</p>`
        : ""
    }

    <hr class="divider" />
    <p style="font-size: 13px; color: #6b7280; margin: 0;">
      Please ensure funds are received by the due date. Contact your fund administrator if you have any questions regarding this capital call.
    </p>
  `;

  return baseLayout(entityName, content);
}

export function distributionPaidEmailHtml({
  entityName,
  distributionDate,
  grossAmount,
  netToLPs,
}: {
  entityName: string;
  distributionDate: string;
  grossAmount: number;
  netToLPs: number;
}): string {
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  const content = `
    <p class="label">Distribution Notice</p>
    <p class="value-large">${fmtCurrency(netToLPs)}</p>
    <p class="value" style="margin-top: -12px; color: #6b7280;">Net to LPs</p>

    <p class="label">Distribution Date</p>
    <p class="value">${distributionDate}</p>

    <p class="label">Gross Distribution Amount</p>
    <p class="value">${fmtCurrency(grossAmount)}</p>

    <hr class="divider" />
    <p style="font-size: 13px; color: #6b7280; margin: 0;">
      Funds have been marked as paid. Please allow 1–3 business days for wire processing. Contact your fund administrator with any questions.
    </p>
  `;

  return baseLayout(entityName, content);
}

export function reportAvailableEmailHtml({
  entityName,
  reportType,
  period,
  portalUrl,
}: {
  entityName: string;
  reportType: string;
  period: string;
  portalUrl: string;
}): string {
  const content = `
    <p class="label">Report Available</p>
    <p class="value-large">${reportType}</p>

    <p class="label">Period</p>
    <p class="value">${period}</p>

    <hr class="divider" />
    <p style="font-size: 13px; color: #374151; margin: 0 0 16px 0;">
      Your ${reportType.toLowerCase()} report for ${period} is now available in the investor portal.
    </p>
    <a href="${portalUrl}" style="display: inline-block; background: #1e293b; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 600;">
      View Report
    </a>
  `;

  return baseLayout(entityName, content);
}

export function k1AvailableEmailHtml({
  entityName,
  taxYear,
  portalUrl,
}: {
  entityName: string;
  taxYear: number;
  portalUrl: string;
}): string {
  const content = `
    <p class="label">Tax Document Available</p>
    <p class="value-large">Schedule K-1</p>
    <p class="value" style="margin-top: -12px; color: #6b7280;">Tax Year ${taxYear}</p>

    <hr class="divider" />
    <p style="font-size: 13px; color: #374151; margin: 0 0 16px 0;">
      Your Schedule K-1 for tax year ${taxYear} is now available in the investor portal. Please share this document with your tax advisor.
    </p>
    <a href="${portalUrl}" style="display: inline-block; background: #1e293b; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 600;">
      Download K-1
    </a>
  `;

  return baseLayout(entityName, content);
}
