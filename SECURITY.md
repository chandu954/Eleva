# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Eleva, please report it privately by emailing the maintainers at **security@eleva.app**.

Please do **not** report security vulnerabilities through public GitHub issues.

## What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Potential impact

## Response Timeline

- **24 hours**: Acknowledgment of receipt
- **7 days**: Initial assessment and mitigation plan
- **30 days**: Fix deployed (depending on severity)

## Scope

The following are in scope:
- Authentication bypass
- Data exposure via API
- RLS policy bypass
- Prompt injection leading to data leakage
- XSS, CSRF, SSRF vulnerabilities

The following are out of scope:
- Rate limiting issues
- Missing security headers
- Self-XSS
- Social engineering attacks
