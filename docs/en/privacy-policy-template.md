# BurnBox Deployer Privacy Policy Template

*This is a template for BurnBox deployers. Replace all placeholder values (marked with `[...]`) before publishing. This template is provided as a starting point only and does not constitute legal advice. Consult qualified local counsel before publishing a privacy policy for a public or third-party-facing deployment.*

---

**Effective date:** [DATE]  
**Operator:** [YOUR NAME OR ORGANIZATION]  
**Contact:** [privacy@your-domain.example]  
**Instance URL:** [https://your-domain.example]

---

## 1. Who operates this service

This BurnBox instance is operated by [YOUR NAME OR ORGANIZATION], not by the BurnBox project author. The BurnBox project author publishes the underlying software as open-source code under GPL-3.0 and is not responsible for the data practices of independently deployed instances.

All questions about this privacy policy should be directed to [YOUR CONTACT].

## 2. What data this instance collects

### 2.1 Account data

If you claim ownership of this workspace, the following data is stored:

- **Email address** — used to identify your account and, where configured, to send password-reset messages
- **Recovery email address** — optional; used only for account recovery
- **Password hash** — your password is stored as a salted PBKDF2-SHA256 hash; the plaintext is never stored
- **Recovery codes** — hashed one-time codes for account recovery

### 2.2 Authentication and security events

The following data is logged for each authentication-related action (sign-in, failed sign-in, password change, recovery, etc.):

- **IP address** of the request
- **Country code** derived from the IP address
- **Browser user-agent string**
- **Event type and outcome**
- **Timestamp**

These records are used to detect and respond to unauthorized access attempts. They are retained for [90 days / YOUR RETENTION PERIOD] and then deleted.

### 2.3 File operation audit logs

The following data is logged when files are uploaded, deleted, shared, or downloaded:

- **IP address** of the request
- **Country code**
- **Action type** (upload, delete, share created, share revoked, download)
- **File and share identifiers** (opaque internal IDs, not the file contents)
- **Timestamp**

These records are used to maintain an audit trail. They are retained for [1 year / YOUR RETENTION PERIOD] and then deleted.

### 2.4 File content

Files uploaded to this instance are stored in the operator's Cloudflare R2 storage bucket. File contents are not accessed, scanned, or processed for any purpose beyond serving them to authorized download recipients.

### 2.5 Share links

When a share link is created, the following metadata is stored:

- File identifier
- Expiry time
- Download limit (if configured)
- A cryptographic handle for URL routing

No personal data about recipients is collected when a share link is accessed.

### 2.6 Session cookies

A session cookie (`burnbox_session`) is set upon sign-in. This cookie contains a signed, tamper-proof session token. It is classified as a strictly necessary functional cookie and is not used for tracking or advertising purposes.

## 3. Cookies

This instance uses one cookie:

| Name | Purpose | Type | Duration |
|------|---------|------|---------|
| `burnbox_session` | Maintains authenticated session | Strictly necessary | 7 days (session) |

No third-party cookies, analytics cookies, or advertising cookies are set.

## 4. How data is used

Data collected by this instance is used for:

- authenticating access to the workspace
- detecting and responding to unauthorized access attempts
- maintaining an audit trail of file operations
- delivering files to authorized recipients via share links
- operating the service and diagnosing technical issues

Data is not used for advertising, profiling, or sale to third parties.

## 5. Data sharing and infrastructure

This instance runs on **Cloudflare Workers**. All data is processed and stored within [YOUR NAME OR ORGANIZATION]'s Cloudflare account, subject to Cloudflare's terms of service and data processing addendum.

Cloudflare may process data in data centers globally in accordance with its own privacy documentation. [If your deployment is subject to GDPR: [YOUR NAME OR ORGANIZATION] has entered into a Data Processing Addendum with Cloudflare as required under GDPR Article 28.]

No data is shared with any other third party unless required by law.

## 6. Data retention

| Data category | Retention period |
|---|---|
| Account data (email, password hash, recovery codes) | Until account is deleted |
| Authentication and security events | [90 days] |
| File operation audit logs | [1 year] |
| File contents | Until the file is deleted by the operator |
| Session cookies | 7 days (or until sign-out) |
| Share link metadata | Until the share expires or is revoked, plus [30 days] |

## 7. Your rights

[Select applicable section(s) based on your jurisdiction and user base.]

### If you are subject to GDPR (EU/EEA residents):

You have the right to:

- **Access** the personal data held about you
- **Rectification** of inaccurate data
- **Erasure** of your data where no legal obligation requires retention
- **Restriction** of processing in certain circumstances
- **Data portability** in a machine-readable format
- **Object** to processing based on legitimate interests
- **Lodge a complaint** with a supervisory authority in your EU member state

To exercise these rights, contact [privacy@your-domain.example].

### If you are subject to CCPA/CPRA (California residents):

You have the right to know what personal information is collected, to request deletion, and to opt out of the sale of personal information. This instance does not sell personal information.

### If you are subject to the Personal Information Protection Law (China):

You have the right to access, copy, correct, delete, and transfer your personal information, and to withdraw consent for processing based on consent. To exercise these rights, contact [privacy@your-domain.example].

## 8. Security

This instance implements the following technical security measures:

- Passwords hashed with PBKDF2-SHA256 (100,000 iterations, random salt)
- Signed session tokens with version invalidation
- HTTPS enforced via Cloudflare
- Security headers: HSTS, X-Frame-Options, Content-Security-Policy
- Rate limiting on authentication endpoints
- Share link signing with a dedicated secret key
- Audit logging of all file operations

## 9. Children

This service is not directed at children under 13 (or 16 where applicable under local law). If you believe a child has provided personal data without appropriate authorization, contact [privacy@your-domain.example].

## 10. Changes to this policy

This policy may be updated from time to time. The effective date at the top of this document reflects the date of the most recent revision. Continued use of this instance after a policy change constitutes acceptance of the revised terms.

## 11. Contact

For questions about this privacy policy or requests to exercise your data rights:

**Email:** [privacy@your-domain.example]  
**Postal address (if required):** [YOUR ADDRESS]

---

*This BurnBox instance is operated independently of the BurnBox project author. For questions about the BurnBox software itself, see the [BurnBox repository](https://github.com/your-username/burnbox).*
