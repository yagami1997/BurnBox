# BurnBox 法的リスク声明

*最終更新: April 14, 2026 at 6:29 PM PDT*

## 1. プロジェクトの位置づけ

BurnBox は、ソースコードとして公開される self-hosted の private file workspace tool です。hosted public file service ではなく、プロジェクト作者が中央集権的に運営するコンテンツ配信 platform でもありません。

BurnBox は次の運用モデルを前提に設計されています。

- file は deployer が管理する infrastructure に保存される
- 管理画面は private を既定とし、public upload portal にはしない
- 外部アクセスは deployer が設定する revocable かつ time-bounded な share link によって付与される
- プロジェクトは public-facing managed service ではなく software source code として配布される

したがって BurnBox maintainer の法的位置づけは、service operator ではなく general-purpose tool author と理解されるべきです。ある個人または組織が BurnBox instance を fork、deploy、configure し、第三者に公開する場合、その instance の法的に意味のある operator は通常その deployer です。

## 2. Tool author であり service operator ではないこと

BurnBox のプロジェクト作者が公開しているのは、再利用可能な code、documentation、および一般的な configuration guidance です。プロジェクト作者は、その行為だけで public upload infrastructure を運営したり、third-party content を moderation したり、third-party instance の end-user account を管理したり、独立して deploy された BurnBox 環境の file を支配したりするものではありません。

この区別は重要です。主要法域では、責任判断はしばしば、誰が実際に service を運営しているか、誰が stored content を control しているか、誰が notice を受け取るか、誰が access rule を定めるか、誰が material の継続提供を決めるかによって左右されます。BurnBox deployment では、それらの機能は upstream source-code author ではなく、個別 instance の deployer および operator に属します。

## 3. Deployer の責任と compliance 境界

BurnBox を自分自身、組織、または third party のために fork、deploy、operate する場合、その service が提供される法域および data が処理される法域で適用される法的義務を評価し、満たす責任は deployer にあります。

その責任には、たとえば次が含まれます。

- 必要に応じた operator identity と contact detail の表示
- terms of use、privacy notice、complaint-handling procedure の整備
- infringement、abuse、unlawful-content notice への対応
- 法令上必要な operational record の保存と提出
- access control、data security、incident response measure の実装
- 必要に応じた sector-specific rule、data localization、cross-border transfer、consumer-protection obligation の評価

deployer 向けのプライバシーポリシーテンプレートが [`docs/en/privacy-policy-template.md`](../en/privacy-policy-template.md) に用意されています。このテンプレートは、BurnBox deployment が収集するデータカテゴリ、推奨保持期間、主要法域（GDPR・CCPA/CPRA・中国 PIPL）における data subject rights の文言を網羅しています。公開前に deployer が内容を確認・適応する必要があり、専門家の法律助言の代替にはなりません。

運用形態によっては、特に次の法制度が関係します。

### United States

- public または third-party-facing な file storage / sharing service を運営する deployer は、DMCA safe harbor に通常関連づけられる条件を満たせるかを自ら評価する必要があります。これには、機能する notice channel、repeat infringer policy、適格な notice に対する timely response などが含まれます。
- deployer は、unauthorized access、credential misuse、access-control circumvention その他 Computer Fraud and Abuse Act 上の exposure を生じうる行為に BurnBox を使用してはなりません。

### European Union

- deployer が intermediary または hosting service provider に該当する場合、Digital Services Act の下で notice handling、point-of-contact duty、illegal-content response procedure その他 platform responsibility が適用されるかを評価する必要があります。
- deployer が personal data を処理する場合、controller または processor として適用される GDPR 上の義務を独自に遵守しなければなりません。これには lawful basis、transparency、data minimization、security measure、data-subject rights handling、必要に応じた cross-border transfer safeguard が含まれます。

### China

- deployer は、中華人民共和国サイバーセキュリティ法および network operation、data handling、personal-information protection に関するその他の applicable rule を自ら評価し、遵守する必要があります。
- deployment が content を public に提供する場合、operator は「情報ネットワーク伝播権保護条例」に基づく notice handling、takedown または link-disabling measure、必要に応じた preservation obligation を評価する必要があります。
- safe harbor 的な地位は automatic ではなく conditional です。operator が infringement を actual knowledge として知っている、または知るべきであった場合、dissemination に material に関与した場合、qualifying notice 後に必要な措置を取らなかった場合、あるいは passive tool provision の範囲を超える場合には、その余地は弱まり、または失われる可能性があります。

### Japan

- deployer は、特定電気通信役務に関する content liability と disclosure の枠組み、一般に「プロバイダ責任制限法（Provider Liability Limitation Act）」と関連づけられるルール、および deployment に適用される後継または改正後の platform-response regime を評価する必要があります。
- deployment を third party に提供する場合、operator は日本法に適合する notice intake route、contact point、removal review process、および retention practice を整備すべきです。

## 4. 法律助言ではないこと

本書は、プロジェクトの位置づけと一般的な risk allocation を示すためのものであり、legal advice、regulatory opinion、またはいかなる法域における compliance guarantee でもありません。

BurnBox instance を third party に開放する前、personal data を処理する前、infringement notice に対応する前、または cross-border operation を行う前に、deployer は資格を有する local counsel に相談すべきです。

## 5. プロジェクト作者による reasonable due diligence

BurnBox は、プロジェクト作者の reasonable diligence を示すような設計および documentation choice とともに配布されています。

- product は open public upload surface ではなく private-by-default workspace model を前提にしている
- public exposure は automatic ではなく operator の deliberate configuration を要する
- project documentation は特定の unlawful use case のための instruction を提供しない
- software には、private file management、controlled sharing、internal distribution、self-hosted storage workflow など substantial lawful use がある
- source project 自体に関する repository-level notice は受け取りうるが、それによって maintainer が third-party instance の operator になるわけではない

これらの要素はすべての法的リスクを消すものではありませんが、BurnBox を infringement や abuse を促進する service ではなく、general-purpose かつ lawful な infrastructure tool として位置づけるための意図的な努力を示しています。

## 6. Content responsibility の境界

BurnBox のプロジェクト作者は、独立して deploy された BurnBox instance に保存された actual file を通常 possess、host、review、cache、または control しません。設計上、それらの file は deployer 自身の Cloudflare account、storage bucket、database、routing configuration、および access policy に置かれます。

したがって:

- project author は third-party deployment を通じて保存、共有、送信、download、表示される file について責任を負いません
- project author は通常、third-party deployment から直接 content を remove したり、独立 operator が発行した access capability を revoke したりできません
- 特定の file、link、deployment に関する complaint は、BurnBox source-code author ではなく、その deployment の operator に向けるべきです

各 deployer は、自身の instance のために明確な complaint route を公開すべきです。例:

- `abuse@your-domain.example`
- `legal@your-domain.example`
- copyright、infringement、abuse 専用の intake form

source code、license、documentation、または BurnBox 自体の security posture に関する repository-level notice については、この repository に公開された maintainer contact route を利用してください。これには [SECURITY.md](../../SECURITY.md) に記載された private reporting channel が含まれます。third-party deployment に保存された content に関する complaint は、その complaint 自体が source project に関するものでない限り、upstream source project に誤って送るべきではありません。

## 7. Dual-use 声明

BurnBox は general-purpose file workspace tool であり、多くの storage / sharing tool と同様に dual-use potential を持ちます。private file management や controlled distribution に使える tool は、一部の deployer によって misuse される可能性もあります。

プロジェクト作者は、unlawful use、infringement、unauthorized access、rights evasion、regulatory evasion を endorse、facilitate、または tailored support しません。BurnBox は、lawful な private file management、controlled self-hosted distribution、および operator-accountable な access control のために設計されています。

## 8. Disclaimer

BurnBox は、applicable law が許す最大限の範囲で、明示または黙示の warranty なしに "AS IS" basis で提供されます。プロジェクト作者は、次を保証しません。

- BurnBox の deployment が特定法域で lawful であること
- operator が safe harbor、intermediary protection、または liability limitation の適用を受けられること
- BurnBox が特定 industry、country、regulatory posture、または dispute context におけるすべての obligation を満たすこと

applicable law が許す最大限の範囲において、プロジェクト作者は、deployment、modification、operation、redistribution、または use から生じる法的結果について責任を否認します。これには third-party claim、administrative enforcement、civil dispute、criminal exposure、downtime、data loss、および reputational harm が含まれます。

BurnBox は GPL-3.0 のもとで公開されています。GPL-3.0 にはすでに no-warranty language が含まれています。本声明は、プロジェクトの位置づけという観点からその risk allocation を補足するものであり、license text 自体を置き換えたり、狭めたりするものではありません。
