# BurnBox Legal Risk Statement

*Last updated: April 14, 2026 at 6:29 PM PDT*

## 1. Project characterization

BurnBox is a self-hosted private file workspace tool released as source code. It is not a hosted public file service, and it is not a centrally operated content platform run by the project author.

BurnBox is designed around the following operational model:

- files are stored in infrastructure controlled by the deployer
- the administration interface is private by default and is not a public upload portal
- external access is granted through revocable and time-bounded share links configured by the deployer
- the project is distributed as software source code rather than as a public-facing managed service

The legal position of the BurnBox maintainer should therefore be understood as that of a general-purpose tool author, not a service operator. Where a person or organization forks, deploys, configures, and exposes a BurnBox instance to others, that deployer is ordinarily the legally relevant operator of that instance.

## 2. Tool author, not service operator

The BurnBox project author publishes reusable code, documentation, and general configuration guidance. The project author does not, by that act alone, operate public upload infrastructure, moderate third-party content, manage end-user accounts for third-party instances, or control the files stored within independently deployed BurnBox environments.

This distinction matters. Across major jurisdictions, liability analysis often turns on who actually operates the service, controls the stored content, receives notices, sets access rules, and decides whether material remains available. For BurnBox deployments, those functions belong to the deployer and operator of the specific instance, not to the upstream source-code author.

## 3. Deployer responsibility and compliance boundary

If you fork, deploy, or operate BurnBox for yourself, your organization, or third parties, you are responsible for evaluating and satisfying the legal obligations that apply in the jurisdiction where the service is made available and where the data is processed.

That responsibility may include:

- publishing operator identity and contact details where required
- adopting terms of use, privacy notices, and complaint-handling procedures
- responding to infringement, abuse, or unlawful-content notices
- retaining and producing operational records where required by law
- implementing access control, data security, and incident-response measures
- assessing sector-specific, data-localization, cross-border transfer, and consumer-protection obligations where relevant

A deployer privacy policy template is available in this repository at [`docs/en/privacy-policy-template.md`](privacy-policy-template.md). The template covers the data categories BurnBox collects, suggested retention periods, and data-subject rights language for major jurisdictions including GDPR, CCPA/CPRA, and China's PIPL. It must be reviewed and adapted by the deployer before publication and is not a substitute for qualified legal advice.

The following legal frameworks are especially relevant, depending on how a deployment is operated:

### United States

- A deployer that operates a public or third-party-facing file storage or sharing service must assess whether it can satisfy the conditions typically associated with DMCA safe-harbor treatment, including a functioning notice channel, a repeat-infringer policy, and timely response to qualifying notices.
- A deployer must not use BurnBox for unauthorized access, credential misuse, access-control circumvention, or other conduct that may create exposure under the Computer Fraud and Abuse Act.

### European Union

- A deployer that qualifies as an intermediary or hosting service provider must assess whether obligations under the Digital Services Act apply, including notice handling, point-of-contact duties, illegal-content response procedures, and other platform responsibilities.
- A deployer that processes personal data must independently comply with GDPR obligations that may apply in its role as controller or processor, including lawful basis, transparency, data minimization, security measures, data-subject rights handling, and cross-border transfer safeguards where necessary.

### China

- A deployer must assess and comply with the Cybersecurity Law of the People's Republic of China and other applicable rules governing network operation, data handling, and personal-information protection.
- Where a deployment makes content available to the public, the operator must assess obligations under the Regulation on the Protection of the Right of Communication through Information Networks, including notice handling, takedown or link-disabling measures, and preservation obligations where applicable.
- Any claimed safe-harbor position is conditional rather than automatic. It may be weakened or lost where the operator has actual knowledge or should know of infringement, materially participates in dissemination, fails to take necessary measures after a qualifying notice, or otherwise falls outside the limits of passive tool provision.

### Japan

- A deployer must assess obligations arising under Japan's content-liability and disclosure framework for specified telecommunications services, including the rules commonly associated with the Provider Liability Limitation Act and any successor or amended platform-response regime that applies to the deployment.
- If the deployment is made available to third parties, the operator should establish an appropriate notice intake route, contact point, removal-review process, and retention practice consistent with applicable Japanese law.

## 4. No legal advice

This document is provided for project-positioning and general risk-allocation purposes only. It is not legal advice, not a regulatory opinion, and not a guarantee of compliance in any jurisdiction.

Before opening a BurnBox instance to third parties, processing personal data, responding to infringement notices, or operating across borders, deployers should consult qualified local counsel.

## 5. Reasonable due diligence by the project author

BurnBox is distributed with design and documentation choices intended to reflect reasonable diligence by the project author:

- the product is built around a private-by-default workspace model rather than an open public upload surface
- public exposure requires deliberate operator configuration instead of occurring automatically
- the project documentation does not provide instructions for any specific unlawful use case
- the software has substantial lawful uses, including private file management, controlled sharing, internal distribution, and self-hosted storage workflows
- the project can receive repository-level notices about the source project itself, but that does not convert the maintainer into the operator of third-party instances

These factors do not eliminate all legal risk, but they do reflect an intentional effort to position BurnBox as a general-purpose, lawful infrastructure tool rather than a service designed to facilitate infringement or abuse.

## 6. Content responsibility boundary

The BurnBox project author does not normally possess, host, review, cache, or control the actual files stored in independently deployed BurnBox instances. By design, those files reside in the deployer's own Cloudflare account, storage bucket, database, routing configuration, and access policy.

Accordingly:

- the project author is not responsible for files stored, shared, transmitted, downloaded, or displayed through third-party deployments
- the project author ordinarily cannot directly remove content from a third-party deployment or revoke access capabilities issued by an independent operator
- complaints about a specific file, link, or deployment should be directed to the operator of that deployment, not to the BurnBox source-code author

Each deployer should publish a clear complaint route for its own instance, such as:

- `abuse@your-domain.example`
- `legal@your-domain.example`
- a dedicated copyright, infringement, or abuse intake form

For repository-level notices concerning the source code, licensing, documentation, or security posture of BurnBox itself, use the maintainer contact route published in this repository, including the private reporting channel referenced in [SECURITY.md](../../SECURITY.md). Do not route complaints about content stored on third-party deployments to the upstream source project unless the complaint actually concerns the source project itself.

## 7. Dual-use statement

BurnBox is a general-purpose file workspace tool and, like many storage and sharing tools, has dual-use potential. A tool that can be used for private file management and controlled distribution can also be misused by some deployers.

The project author does not endorse, facilitate, or provide tailored support for unlawful use, infringement, unauthorized access, rights evasion, or regulatory evasion. BurnBox is principally designed for lawful private file management, controlled self-hosted distribution, and operator-accountable access control.

## 8. Disclaimer

BurnBox is provided on an "AS IS" basis, without express or implied warranties, to the maximum extent permitted by applicable law. The project author does not guarantee:

- that any deployment of BurnBox is lawful in a particular jurisdiction
- that any operator will qualify for safe-harbor treatment, intermediary protections, or liability limitations
- that BurnBox satisfies all obligations applicable to a given industry, country, regulatory posture, or dispute context

To the maximum extent permitted by applicable law, the project author disclaims responsibility for legal consequences arising from deployment, modification, operation, redistribution, or use of BurnBox, including third-party claims, administrative enforcement, civil disputes, criminal exposure, downtime, data loss, and reputational harm.

BurnBox is released under GPL-3.0. The GPL-3.0 license already contains no-warranty language. This statement supplements that allocation of risk for project-positioning purposes and does not replace or narrow the actual license text.
