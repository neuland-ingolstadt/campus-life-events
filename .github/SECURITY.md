# Security Policy

## Supported Versions

**Only the latest released version** of Campus Life Events is actively supported with security updates.

| Version     | Supported          |
|-------------|--------------------|
| Latest      | ✅ Yes              |
| Older       | ❌ No               |

## Reporting a Vulnerability

If you discover a security vulnerability, we encourage responsible disclosure. Please avoid public disclosure until we've had a chance to investigate and issue a fix.

### How to Report

- Email: [security@neuland-ingolstadt.de](mailto:security@neuland-ingolstadt.de)
- GitHub: [Report a vulnerability](https://github.com/neuland-ingolstadt/campus-life-events/security/advisories)

### What to Expect

- Acknowledgment within **3 business days**
- Updates on investigation and remediation progress
- Notification when a fix has been released or the issue is closed

## Security Practices

We apply industry best practices to ensure a secure internal dashboard:

- 🔒 User credentials are securely hashed using Argon2
- 🗝️ Session management with secure HTTP-only cookies
- 📡 All communication is encrypted via HTTPS
- 🛠️ The system is regularly scanned for vulnerabilities using GitHub CodeQL and automated CI workflows
- 🔍 The source code is fully open and available for independent review
- 🛡️ CORS protection and security headers are implemented
- 📊 Audit logging for all actions

## Disclosure Policy

We kindly ask:

- Do not publicly disclose vulnerabilities before we've resolved them
- Provide clear steps to reproduce any issue
- Do not perform tests on production systems without permission

Thank you for helping us keep Campus Life Events secure for everyone!
