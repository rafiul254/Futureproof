"""Curated skill taxonomy for the FutureProof seed.

Status: CURATED, NOT O*NET.
These entries are hand-authored placeholders so the product is fully functional
and demoable before the O*NET download lands. When O*NET is loaded
(see docs/guidelines.md) these rows are replaced by `source_id = 'onet:<id>'`
rows and the curated ones are kept only as aliases.

Tuple format: (id, name_en, name_bn, aliases)
`name_bn` values are machine-translated and flagged in docs/DATA_SOURCES.md.
"""

# ---------------------------------------------------------------- programming
PROGRAMMING = [
    ("python", "Python", "পাইথন", ["python3", "py"]),
    ("javascript", "JavaScript", "জাভাস্ক্রিপ্ট", ["js", "ecmascript"]),
    ("typescript", "TypeScript", "টাইপস্ক্রিপ্ট", ["ts"]),
    ("java", "Java", "জাভা", []),
    ("c", "C", "সি", []),
    ("cpp", "C++", "সি++", ["cplusplus"]),
    ("csharp", "C#", "সি শার্প", ["c sharp", ".net"]),
    ("php", "PHP", "পিএইচপি", []),
    ("ruby", "Ruby", "রুবি", []),
    ("go", "Go", "গো", ["golang"]),
    ("rust", "Rust", "রাস্ট", []),
    ("kotlin", "Kotlin", "কটলিন", []),
    ("swift", "Swift", "সুইফট", []),
    ("r", "R", "আর", ["r language"]),
    ("matlab", "MATLAB", "ম্যাটল্যাব", []),
    ("scala", "Scala", "স্কালা", []),
    ("dart", "Dart", "ডার্ট", []),
    ("sql", "SQL", "এসকিউএল", ["structured query language"]),
    ("html", "HTML", "এইচটিএমএল", ["html5"]),
    ("css", "CSS", "সিএসএস", ["css3"]),
    ("bash", "Bash / Shell scripting", "ব্যাশ / শেল স্ক্রিপ্টিং", ["shell", "shell scripting"]),
    ("powershell", "PowerShell", "পাওয়ারশেল", []),
    ("perl", "Perl", "পার্ল", []),
    ("objective-c", "Objective-C", "অবজেক্টিভ-সি", []),
    ("solidity", "Solidity", "সলিডিটি", []),
]

# ------------------------------------------------------------------- frontend
FRONTEND = [
    ("react", "React", "রিঅ্যাক্ট", ["reactjs", "react.js"]),
    ("nextjs", "Next.js", "নেক্সট.জেএস", ["next"]),
    ("vue", "Vue.js", "ভিউ.জেএস", ["vuejs"]),
    ("angular", "Angular", "অ্যাঙ্গুলার", ["angularjs"]),
    ("svelte", "Svelte", "সভেল্ট", ["sveltekit"]),
    ("tailwind", "Tailwind CSS", "টেইলউইন্ড সিএসএস", ["tailwindcss"]),
    ("bootstrap", "Bootstrap", "বুটস্ট্র্যাপ", []),
    ("jquery", "jQuery", "জেকুয়েরি", []),
    ("redux", "Redux", "রিডাক্স", ["state management"]),
    ("webpack", "Webpack", "ওয়েবপ্যাক", []),
    ("vite", "Vite", "ভিট", []),
    ("sass", "Sass / SCSS", "সাস / এসসিএসএস", ["scss", "less"]),
    ("responsive-design", "Responsive design", "রেসপনসিভ ডিজাইন", ["mobile-first"]),
    ("accessibility", "Web accessibility (WCAG)", "ওয়েব অ্যাক্সেসিবিলিটি", ["wcag", "a11y"]),
    ("pwa", "Progressive web apps", "প্রগ্রেসিভ ওয়েব অ্যাপ", ["service workers"]),
    ("graphql", "GraphQL", "গ্রাফকিউএল", []),
    ("rest-api", "REST API design", "রেস্ট এপিআই ডিজাইন", ["restful", "api development"]),
    ("websockets", "WebSockets", "ওয়েবসকেট", ["real-time"]),
    ("threejs", "Three.js / WebGL", "থ্রি.জেএস / ওয়েবজিএল", ["webgl"]),
    ("framer-motion", "Animation libraries", "অ্যানিমেশন লাইব্রেরি", ["framer motion", "gsap"]),
]

# -------------------------------------------------------------------- backend
BACKEND = [
    ("nodejs", "Node.js", "নোড.জেএস", ["node"]),
    ("express", "Express.js", "এক্সপ্রেস.জেএস", ["expressjs"]),
    ("django", "Django", "জ্যাঙ্গো", []),
    ("flask", "Flask", "ফ্লাস্ক", []),
    ("fastapi", "FastAPI", "ফাস্টএপিআই", []),
    ("spring", "Spring / Spring Boot", "স্প্রিং বুট", ["spring boot"]),
    ("laravel", "Laravel", "লারাভেল", []),
    ("rails", "Ruby on Rails", "রুবি অন রেইলস", ["rails"]),
    ("aspnet", "ASP.NET", "এএসপি.নেট", [".net core"]),
    ("microservices", "Microservices architecture", "মাইক্রোসার্ভিস আর্কিটেকচার", []),
    ("serverless", "Serverless computing", "সার্ভারলেস কম্পিউটিং", ["lambda", "cloud functions"]),
    ("rabbitmq", "RabbitMQ", "র‍্যাবিটএমকিউ", ["message queues"]),
    ("kafka", "Apache Kafka", "অ্যাপাচে কাফকা", ["event streaming"]),
    ("grpc", "gRPC", "জিআরপিসি", []),
    ("authentication", "Authentication and authorisation", "প্রমাণীকরণ ও অনুমোদন", ["oauth", "jwt", "sso"]),
    ("redis", "Redis", "রেডিস", ["caching"]),
    ("unit-testing", "Unit testing", "ইউনিট টেস্টিং", ["jest", "pytest", "tdd"]),
    ("debugging", "Debugging", "ডিবাগিং", ["troubleshooting"]),
]

# ------------------------------------------------------------------ databases
DATABASES = [
    ("postgresql", "PostgreSQL", "পোস্টগ্রেসকিউএল", ["postgres"]),
    ("mysql", "MySQL", "মাইএসকিউএল", ["mariadb"]),
    ("mongodb", "MongoDB", "মঙ্গোডিবি", ["nosql"]),
    ("sqlite", "SQLite", "এসকিউলাইট", []),
    ("elasticsearch", "Elasticsearch", "ইলাস্টিকসার্চ", ["search engines"]),
    ("oracle-db", "Oracle Database", "ওরাকল ডেটাবেস", ["oracle"]),
    ("sql-server", "Microsoft SQL Server", "এমএস এসকিউএল সার্ভার", ["mssql"]),
    ("firebase", "Firebase", "ফায়ারবেস", ["firestore"]),
    ("dynamodb", "DynamoDB", "ডায়নামোডিবি", []),
    ("cassandra", "Cassandra", "ক্যাসান্ড্রা", []),
    ("neo4j", "Neo4j", "নিওফোরজে", ["graph databases"]),
    ("database-design", "Database design", "ডেটাবেস ডিজাইন", ["normalisation", "schema design"]),
]

# --------------------------------------------------------------- cloud/devops
CLOUD_DEVOPS = [
    ("aws", "Amazon Web Services", "এডব্লিউএস", ["amazon web services"]),
    ("azure", "Microsoft Azure", "অ্যাজুর", []),
    ("gcp", "Google Cloud Platform", "গুগল ক্লাউড", ["google cloud"]),
    ("docker", "Docker", "ডকার", ["containers"]),
    ("kubernetes", "Kubernetes", "কুবারনেটিস", ["k8s"]),
    ("terraform", "Terraform", "টেরাফর্ম", ["infrastructure as code"]),
    ("ansible", "Ansible", "অ্যানসিবল", ["configuration management"]),
    ("jenkins", "Jenkins", "জেনকিন্স", []),
    ("github-actions", "GitHub Actions", "গিটহাব অ্যাকশন", ["github actions ci"]),
    ("cicd", "CI/CD pipelines", "সিআই/সিডি পাইপলাইন", ["continuous integration"]),
    ("linux", "Linux administration", "লিনাক্স প্রশাসন", ["ubuntu", "unix"]),
    ("nginx", "Nginx", "এনজিনক্স", ["web servers", "apache"]),
    ("monitoring", "System monitoring", "সিস্টেম মনিটরিং", ["observability"]),
    ("prometheus", "Prometheus", "প্রমিথিউস", []),
    ("grafana", "Grafana", "গ্রাফানা", []),
    ("cloud-security", "Cloud security", "ক্লাউড নিরাপত্তা", []),
    ("backup-recovery", "Backup and disaster recovery", "ব্যাকআপ ও ডিজাস্টার রিকভারি", []),
    ("git", "Git / version control", "গিট / ভার্সন কন্ট্রোল", ["github", "version control"]),
]

# --------------------------------------------------------------- data science
DATA_SCIENCE = [
    ("pandas", "pandas", "পান্ডাস", []),
    ("numpy", "NumPy", "নামপাই", []),
    ("scikit-learn", "scikit-learn", "সাইকিট-লার্ন", ["sklearn"]),
    ("tensorflow", "TensorFlow", "টেনসরফ্লো", []),
    ("pytorch", "PyTorch", "পাইটর্চ", []),
    ("keras", "Keras", "কেরাস", []),
    ("jupyter", "Jupyter notebooks", "জুপিটার নোটবুক", ["notebooks"]),
    ("statistics", "Statistics", "পরিসংখ্যান", ["statistical analysis"]),
    ("hypothesis-testing", "Hypothesis testing", "অনুমান পরীক্ষণ", ["significance testing"]),
    ("ab-testing", "A/B testing", "এ/বি টেস্টিং", ["experiment design"]),
    ("regression", "Regression analysis", "রিগ্রেশন বিশ্লেষণ", ["linear regression"]),
    ("time-series", "Time series analysis", "টাইম সিরিজ বিশ্লেষণ", []),
    ("nlp", "Natural language processing", "প্রাকৃতিক ভাষা প্রক্রিয়াকরণ", ["nlp", "text mining"]),
    ("computer-vision", "Computer vision", "কম্পিউটার ভিশন", ["image processing", "opencv"]),
    ("deep-learning", "Deep learning", "ডিপ লার্নিং", ["neural networks"]),
    ("llm-apps", "LLM application development", "এলএলএম অ্যাপ তৈরি", ["llm", "generative ai"]),
    ("prompt-engineering", "Prompt engineering", "প্রম্পট ইঞ্জিনিয়ারিং", []),
    ("feature-engineering", "Feature engineering", "ফিচার ইঞ্জিনিয়ারিং", []),
    ("model-evaluation", "Model evaluation", "মডেল মূল্যায়ন", ["model validation"]),
    ("mlops", "MLOps", "এমএলঅপস", ["model deployment"]),
    ("data-pipelines", "Data pipelines", "ডেটা পাইপলাইন", []),
    ("etl", "ETL processes", "ইটিএল প্রক্রিয়া", ["data integration"]),
    ("data-warehousing", "Data warehousing", "ডেটা ওয়্যারহাউজিং", []),
    ("bigquery", "BigQuery", "বিগকুয়েরি", []),
    ("spark", "Apache Spark", "অ্যাপাচে স্পার্ক", ["pyspark"]),
    ("hadoop", "Hadoop", "হ্যাডুপ", ["hdfs"]),
    ("airflow", "Apache Airflow", "অ্যাপাচে এয়ারফ্লো", ["orchestration"]),
    ("dbt", "dbt", "ডিবিটি", []),
    ("web-scraping", "Web scraping", "ওয়েব স্ক্র্যাপিং", ["crawling"]),
    ("data-cleaning", "Data cleaning", "ডেটা পরিষ্কারকরণ", ["data wrangling"]),
]

# ------------------------------------------------------------------ BI/viz
ANALYTICS_BI = [
    ("power-bi", "Power BI", "পাওয়ার বিআই", []),
    ("tableau", "Tableau", "ট্যাবলো", []),
    ("looker-studio", "Looker Studio", "লুকার স্টুডিও", ["google data studio"]),
    ("metabase", "Metabase", "মেটাবেস", []),
    ("excel", "Microsoft Excel", "মাইক্রোসফট এক্সেল", ["spreadsheets"]),
    ("google-sheets", "Google Sheets", "গুগল শিট", []),
    ("matplotlib", "Matplotlib", "ম্যাটপ্লটলিব", []),
    ("seaborn", "Seaborn", "সিবর্ন", []),
    ("plotly", "Plotly", "প্লটলি", []),
    ("d3", "D3.js", "ডি৩.জেএস", ["data visualisation code"]),
    ("dashboards", "Dashboard design", "ড্যাশবোর্ড ডিজাইন", ["reporting dashboards"]),
    ("kpi-reporting", "KPI reporting", "কেপিআই রিপোর্টিং", ["management reporting"]),
]

# -------------------------------------------------------------------- design
DESIGN = [
    ("figma", "Figma", "ফিগমা", []),
    ("photoshop", "Adobe Photoshop", "অ্যাডোবি ফটোশপ", ["photoshop"]),
    ("illustrator", "Adobe Illustrator", "অ্যাডোবি ইলাস্ট্রেটর", ["illustrator"]),
    ("indesign", "Adobe InDesign", "অ্যাডোবি ইনডিজাইন", ["indesign"]),
    ("canva", "Canva", "ক্যানভা", []),
    ("xd", "Adobe XD", "অ্যাডোবি এক্সডি", ["adobe xd"]),
    ("sketch", "Sketch", "স্কেচ", []),
    ("ui-design", "UI design", "ইউআই ডিজাইন", ["interface design"]),
    ("ux-research", "UX research", "ইউএক্স গবেষণা", ["user research"]),
    ("wireframing", "Wireframing", "ওয়্যারফ্রেমিং", ["mockups"]),
    ("prototyping", "Prototyping", "প্রোটোটাইপিং", ["interactive prototypes"]),
    ("design-systems", "Design systems", "ডিজাইন সিস্টেম", ["component libraries"]),
    ("typography", "Typography", "টাইপোগ্রাফি", ["font selection"]),
    ("color-theory", "Colour theory", "রঙ তত্ত্ব", ["color theory"]),
    ("branding", "Brand identity design", "ব্র্যান্ড পরিচয় ডিজাইন", ["brand design", "logo design"]),
    ("motion-graphics", "Motion graphics", "মোশন গ্রাফিক্স", []),
]

# --------------------------------------------------------------- video/audio
MEDIA = [
    ("premiere", "Adobe Premiere Pro", "অ্যাডোবি প্রিমিয়ার প্রো", ["video editing"]),
    ("after-effects", "After Effects", "আফটার এফেক্টস", []),
    ("resolve", "DaVinci Resolve", "ডাভিঞ্চি রিজলভ", []),
    ("audio-editing", "Audio editing", "অডিও সম্পাদনা", ["audacity", "sound editing"]),
    ("animation", "Animation", "অ্যানিমেশন", ["2d animation"]),
    ("visual-storytelling", "Visual storytelling", "ভিজ্যুয়াল গল্প বলা", ["storyboarding"]),
    ("voice-over", "Voice-over and narration", "ভয়েস-ওভার ও বর্ণনা", []),
    ("photography", "Photography", "ফটোগ্রাফি", []),
]

# ------------------------------------------------------------------- writing
WRITING = [
    ("content-writing", "Content writing", "কনটেন্ট লেখা", ["article writing"]),
    ("copywriting", "Copywriting", "কপিরাইটিং", ["ad copy"]),
    ("technical-writing", "Technical writing", "টেকনিক্যাল লেখা", ["documentation writing"]),
    ("editing", "Editing", "সম্পাদনা", ["line editing"]),
    ("proofreading", "Proofreading", "প্রুফরিডিং", ["grammar checking"]),
    ("seo-writing", "SEO writing", "এসইও লেখা", ["search-optimised writing"]),
    ("script-writing", "Script writing", "স্ক্রিপ্ট লেখা", ["scriptwriting"]),
    ("grant-writing", "Grant and proposal writing", "অনুদান ও প্রস্তাব লেখা", ["proposal writing"]),
    ("report-writing", "Report writing", "প্রতিবেদন লেখা", []),
    ("social-copy", "Social media copy", "সোশ্যাল মিডিয়া কপি", ["caption writing"]),
    ("transcription", "Transcription", "ট্রান্সক্রিপশন", ["transcribing"]),
    ("documentation", "Documentation", "ডকুমেন্টেশন", ["knowledge base"]),
    ("academic-writing", "Academic writing", "একাডেমিক লেখা", ["research papers"]),
    ("creative-writing", "Creative writing", "সৃজনশীল লেখা", []),
]

# ----------------------------------------------------------------- marketing
MARKETING = [
    ("seo", "Search engine optimisation", "সার্চ ইঞ্জিন অপটিমাইজেশন", ["seo"]),
    ("sem", "Search engine marketing", "সার্চ ইঞ্জিন মার্কেটিং", ["ppc", "paid search"]),
    ("google-ads", "Google Ads", "গুগল অ্যাডস", ["adwords"]),
    ("facebook-ads", "Facebook and Instagram ads", "ফেসবুক ও ইনস্টাগ্রাম অ্যাডস", ["meta ads"]),
    ("social-media-marketing", "Social media marketing", "সোশ্যাল মিডিয়া মার্কেটিং", ["smm"]),
    ("email-marketing", "Email marketing", "ইমেইল মার্কেটিং", ["newsletters", "mailchimp"]),
    ("content-marketing", "Content marketing", "কনটেন্ট মার্কেটিং", ["content strategy"]),
    ("influencer-marketing", "Influencer marketing", "ইনফ্লুয়েন্সার মার্কেটিং", []),
    ("marketing-analytics", "Marketing analytics", "মার্কেটিং অ্যানালিটিক্স", ["campaign analytics"]),
    ("google-analytics", "Google Analytics", "গুগল অ্যানালিটিক্স", ["ga4"]),
    ("facebook-pixel", "Meta Pixel and conversion tracking", "মেটা পিক্সেল ও কনভার্সন ট্র্যাকিং", []),
    ("lead-generation", "Lead generation", "লিড জেনারেশন", []),
    ("brand-management", "Brand management", "ব্র্যান্ড ব্যবস্থাপনা", []),
    ("market-research", "Market research", "বাজার গবেষণা", ["consumer research"]),
    ("campaign-management", "Campaign management", "ক্যাম্পেইন ব্যবস্থাপনা", []),
    ("affiliate-marketing", "Affiliate marketing", "অ্যাফিলিয়েট মার্কেটিং", []),
    ("marketing-automation", "Marketing automation", "মার্কেটিং অটোমেশন", ["hubspot"]),
    ("ecommerce-operations", "E-commerce operations", "ই-কমার্স পরিচালনা", ["shopify", "product listing"]),
]

# ------------------------------------------------------- accounting / finance
FINANCE = [
    ("financial-accounting", "Financial accounting", "আর্থিক হিসাববিজ্ঞান", ["accounting"]),
    ("management-accounting", "Management accounting", "ব্যবস্থাপনা হিসাববিজ্ঞান", ["cost accounting"]),
    ("bookkeeping", "Bookkeeping", "খতিয়ান রক্ষণ", ["ledger"]),
    ("tally", "Tally ERP", "ট্যালি ইআরপি", ["tally erp 9"]),
    ("quickbooks", "QuickBooks", "কুইকবুকস", []),
    ("financial-modelling", "Financial modelling", "আর্থিক মডেলিং", ["excel modelling"]),
    ("financial-reporting", "Financial reporting", "আর্থিক প্রতিবেদন", ["balance sheet"]),
    ("budgeting", "Budgeting", "বাজেট প্রণয়ন", ["budget preparation"]),
    ("financial-forecasting", "Financial forecasting", "আর্থিক পূর্বাভাস", []),
    ("auditing", "Auditing", "নিরীক্ষা", ["internal audit"]),
    ("taxation", "Taxation", "কর বিষয়ক", ["income tax"]),
    ("vat", "VAT and customs duty", "ভ্যাট ও শুল্ক", ["value added tax"]),
    ("payroll", "Payroll processing", "বেতন প্রক্রিয়াকরণ", []),
    ("reconciliation", "Bank reconciliation", "ব্যাংক রিকনসিলিয়েশন", []),
    ("ifrs", "IFRS and accounting standards", "আইএফআরএস ও হিসাব মান", ["gaap"]),
    ("ratio-analysis", "Financial ratio analysis", "আর্থিক অনুপাত বিশ্লেষণ", []),
    ("investment-analysis", "Investment analysis", "বিনিয়োগ বিশ্লেষণ", ["valuation"]),
    ("risk-analysis", "Risk analysis", "ঝুঁকি বিশ্লেষণ", ["risk assessment"]),
]

# -------------------------------------------------------------------- banking
BANKING = [
    ("kyc", "KYC and customer due diligence", "কেওয়াইসি ও গ্রাহক যাচাই", ["know your customer"]),
    ("credit-analysis", "Credit analysis", "ঋণ বিশ্লেষণ", ["credit appraisal"]),
    ("loan-processing", "Loan processing", "ঋণ প্রক্রিয়াকরণ", ["lending"]),
    ("retail-banking", "Retail banking operations", "খুচরা ব্যাংকিং কার্যক্রম", ["branch banking"]),
    ("treasury", "Treasury operations", "ট্রেজারি কার্যক্রম", []),
    ("regulatory-compliance", "Regulatory compliance", "নিয়ন্ত্রক সম্মতি", ["compliance"]),
    ("aml", "Anti-money laundering", "মানি লন্ডারিং প্রতিরোধ", ["aml", "sanctions screening"]),
    ("customer-onboarding", "Customer onboarding", "গ্রাহক অনবোর্ডিং", ["account opening"]),
    ("core-banking", "Core banking software", "কোর ব্যাংকিং সফটওয়্যার", ["cbs"]),
    ("financial-regulation", "Banking regulation (Bangladesh Bank)", "ব্যাংকিং নিয়মনীতি", ["bangladesh bank"]),
]

# ------------------------------------------------------------------------- HR
HR = [
    ("recruitment", "Recruitment and selection", "নিয়োগ ও বাছাই", ["talent acquisition", "hiring"]),
    ("interviewing", "Interviewing", "সাক্ষাৎকার নেওয়া", ["candidate screening"]),
    ("onboarding", "Employee onboarding", "কর্মী অনবোর্ডিং", ["induction"]),
    ("performance-management", "Performance management", "কর্মদক্ষতা ব্যবস্থাপনা", ["appraisals"]),
    ("employee-relations", "Employee relations", "কর্মী সম্পর্ক", ["grievance handling"]),
    ("hris", "HR information systems", "এইচআর তথ্য ব্যবস্থা", ["hris software"]),
    ("training-development", "Training and development", "প্রশিক্ষণ ও উন্নয়ন", ["l&d"]),
    ("compensation-benefits", "Compensation and benefits", "বেতন ও সুবিধা", ["payroll admin"]),
    ("labour-law", "Labour law (Bangladesh)", "শ্রম আইন", ["labor law", "bepza compliance"]),
    ("conflict-resolution", "Conflict resolution", "দ্বন্দ্ব নিষ্পত্তি", ["mediation"]),
    ("hr-analytics", "HR analytics", "এইচআর অ্যানালিটিক্স", ["people analytics"]),
    ("organisational-development", "Organisational development", "প্রাতিষ্ঠানিক উন্নয়ন", []),
]

# ---------------------------------------------------------------------- sales
SALES = [
    ("prospecting", "Prospecting", "সম্ভাব্য ক্রেতা খোঁজা", ["lead sourcing"]),
    ("negotiation", "Negotiation", "দর কষাকষি", ["deal negotiation"]),
    ("cold-calling", "Cold calling", "কোল্ড কলিং", ["outbound calls"]),
    ("client-relationship", "Client relationship management", "ক্লায়েন্ট সম্পর্ক ব্যবস্থাপনা", ["account management"]),
    ("sales-presentations", "Sales presentations", "বিক্রয় উপস্থাপনা", ["pitching"]),
    ("closing", "Closing deals", "চুক্তি সম্পন্ন করা", ["deal closing"]),
    ("pipeline-management", "Sales pipeline management", "বিক্রয় পাইপলাইন ব্যবস্থাপনা", []),
    ("territory-management", "Territory management", "এলাকা ব্যবস্থাপনা", ["route planning"]),
    ("b2b-sales", "B2B sales", "বিটুবি বিক্রয়", ["corporate sales"]),
    ("retail-sales", "Retail sales", "খুচরা বিক্রয়", ["in-store sales"]),
    ("upselling", "Upselling and cross-selling", "আপসেলিং ও ক্রস-সেলিং", []),
    ("after-sales", "After-sales service", "বিক্রয়োত্তর সেবা", ["customer follow-up"]),
]

# --------------------------------------------------------- customer service
CUSTOMER_SERVICE = [
    ("customer-support", "Customer support", "গ্রাহক সহায়তা", ["customer service"]),
    ("ticketing-systems", "Ticketing systems", "টিকেটিং সিস্টেম", ["zendesk", "freshdesk"]),
    ("live-chat", "Live chat support", "লাইভ চ্যাট সাপোর্ট", ["chat support"]),
    ("complaint-handling", "Complaint handling", "অভিযোগ মোকাবেলা", ["issue resolution"]),
    ("call-handling", "Call handling", "কল গ্রহণ", ["inbound calls"]),
    ("escalation-management", "Escalation management", "এসকেলেশন ব্যবস্থাপনা", ["escalations"]),
    ("customer-satisfaction", "Customer satisfaction measurement", "গ্রাহক সন্তুষ্টি পরিমাপ", ["csat", "nps"]),
    ("sla-management", "SLA management", "এসএলএ ব্যবস্থাপনা", ["service levels"]),
    ("active-listening", "Active listening", "মনোযোগ দিয়ে শোনা", []),
    ("call-scripting", "Call scripting and standard replies", "কল স্ক্রিপ্ট ও প্রমিত উত্তর", ["macros"]),
    ("multilingual-support", "Multilingual support (Bangla/English)", "বহুভাষিক সহায়তা", ["bangla english"]),
    ("service-recovery", "Service recovery", "সেবা পুনরুদ্ধার", ["retention calls"]),
]

# ----------------------------------------------------------- ops / supply chain
OPERATIONS = [
    ("inventory-management", "Inventory management", "মজুদ ব্যবস্থাপনা", ["stock control"]),
    ("procurement", "Procurement", "ক্রয় কার্যক্রম", ["purchasing"]),
    ("logistics-coordination", "Logistics coordination", "লজিস্টিক্স সমন্বয়", ["shipping coordination"]),
    ("warehouse-management", "Warehouse management", "গুদাম ব্যবস্থাপনা", ["wms"]),
    ("demand-planning", "Demand planning", "চাহিদা পরিকল্পনা", []),
    ("vendor-management", "Vendor management", "সরবরাহকারী ব্যবস্থাপনা", ["supplier management"]),
    ("quality-control", "Quality control", "মান নিয়ন্ত্রণ", ["qc", "inspection"]),
    ("production-planning", "Production planning", "উৎপাদন পরিকল্পনা", ["scheduling"]),
    ("lean", "Lean manufacturing", "লিন উৎপাদন", ["5s", "kaizen"]),
    ("six-sigma", "Six Sigma", "সিক্স সিগমা", ["process improvement"]),
    ("erp", "ERP systems", "ইআরপি সিস্টেম", ["sap", "oracle erp"]),
    ("fleet-management", "Fleet management", "যানবাহন ব্যবস্থাপনা", []),
    ("customs-documentation", "Customs documentation", "শুল্ক ডকুমেন্টেশন", ["hs codes"]),
    ("health-safety", "Occupational health and safety", "পেশাগত স্বাস্থ্য ও নিরাপত্তা", ["hse"]),
]

# --------------------------------------------------------------- apparel / RMG
APPAREL = [
    ("merchandising", "Apparel merchandising", "পোশাক মার্চেন্ডাইজিং", ["garment merchandising"]),
    ("garment-construction", "Garment construction", "পোশাক নির্মাণ", ["stitching", "sewing"]),
    ("pattern-making", "Pattern making", "প্যাটার্ন তৈরি", ["grading"]),
    ("fabric-knowledge", "Fabric and trims knowledge", "কাপড় ও ট্রিম সম্পর্কে জ্ঞান", ["textiles"]),
    ("costing", "Garment costing", "পোশাক কস্টিং", ["cost sheet"]),
    ("garment-sampling", "Sampling and product development", "স্যাম্পলিং ও পণ্য উন্নয়ন", ["sampling"]),
    ("production-followup", "Production follow-up", "উৎপাদন অনুসরণ", ["line balancing"]),
    ("buyer-communication", "Buyer communication", "বায়ার যোগাযোগ", ["buyer handling"]),
    ("social-compliance-audit", "Social compliance audit", "সামাজিক কমপ্লায়েন্স নিরীক্ষা", ["accord", "alliance"]),
    ("industrial-engineering", "Industrial engineering (RMG)", "ইন্ডাস্ট্রিয়াল ইঞ্জিনিয়ারিং", ["ie", "smv"]),
    ("knitting", "Knitting technology", "নিটিং প্রযুক্তি", []),
    ("dyeing", "Dyeing and finishing", "রং ও ফিনিশিং", ["wet processing"]),
]

# ------------------------------------------------------------- civil eng.
CIVIL = [
    ("autocad", "AutoCAD", "অটোক্যাড", ["cad"]),
    ("staad-pro", "STAAD Pro", "স্টাড প্রো", ["structural analysis"]),
    ("structural-design", "Structural design", "কাঠামোগত ডিজাইন", ["rcc design"]),
    ("site-supervision", "Site supervision", "সাইট তত্ত্বাবধান", ["site engineering"]),
    ("quantity-surveying", "Quantity surveying", "পরিমাণ জরিপ", ["billing"]),
    ("estimation", "Cost estimation", "ব্যয় নিরূপণ", ["boq"]),
    ("concrete-technology", "Concrete technology", "কংক্রিট প্রযুক্তি", ["mix design"]),
    ("soil-mechanics", "Soil mechanics and geotechnics", "মৃত্তিকা বলবিদ্যা", ["geotechnical"]),
    ("land-survey", "Land surveying", "জমি জরিপ", ["total station"]),
    ("technical-drawings", "Technical drawing reading", "টেকনিক্যাল ড্রয়িং পড়া", ["blueprints"]),
    ("water-supply-design", "Water supply and sanitation design", "পানি সরবরাহ ও স্যানিটেশন ডিজাইন", ["wash"]),
    ("transportation-engineering", "Transportation engineering", "পরিবহন প্রকৌশল", ["highway design"]),
]

# --------------------------------------------------------- electrical eng.
ELECTRICAL = [
    ("circuit-design", "Circuit design", "সার্কিট ডিজাইন", ["circuit analysis"]),
    ("pcb-design", "PCB design", "পিসিবি ডিজাইন", ["altium", "kicad"]),
    ("simulink", "MATLAB/Simulink", "ম্যাটল্যাব/সিমুলিংক", ["simulink"]),
    ("power-systems", "Power systems", "বিদ্যুৎ ব্যবস্থা", ["power distribution"]),
    ("electrical-maintenance", "Electrical maintenance", "বৈদ্যুতিক রক্ষণাবেক্ষণ", ["troubleshooting equipment"]),
    ("plc", "PLC programming", "পিএলসি প্রোগ্রামিং", ["automation"]),
    ("scada", "SCADA systems", "স্কাডা সিস্টেম", ["hmi"]),
    ("wiring", "Electrical wiring and installation", "বৈদ্যুতিক তার সংযোগ", []),
    ("load-calculation", "Load calculation", "লোড হিসাব", ["sizing"]),
    ("transformers", "Transformers and switchgear", "ট্রান্সফরমার ও সুইচগিয়ার", []),
    ("renewable-energy", "Renewable energy systems", "নবায়নযোগ্য শক্তি ব্যবস্থা", ["solar", "solar pv"]),
    ("electrical-safety", "Electrical safety standards", "বৈদ্যুতিক নিরাপত্তা মান", ["earthing"]),
]

# --------------------------------------------------------- network / cyber
NETWORK_SECURITY = [
    ("networking-basics", "Computer networking fundamentals", "নেটওয়ার্কিং মৌলিক", ["ccna", "networking"]),
    ("tcp-ip", "TCP/IP and DNS", "টিসিপি/আইপি ও ডিএনএস", ["dns", "subnetting"]),
    ("routing-switching", "Routing and switching", "রাউটিং ও সুইচিং", ["vlan", "ospf"]),
    ("firewalls", "Firewall configuration", "ফায়ারওয়াল কনফিগারেশন", ["pfsense", "fortinet"]),
    ("vpn", "VPN and remote access", "ভিপিএন ও রিমোট অ্যাক্সেস", []),
    ("network-troubleshooting", "Network troubleshooting", "নেটওয়ার্ক সমস্যা সমাধান", ["wireshark", "packet analysis"]),
    ("windows-server", "Windows Server administration", "উইন্ডোজ সার্ভার প্রশাসন", []),
    ("active-directory", "Active Directory", "অ্যাকটিভ ডিরেক্টরি", ["group policy"]),
    ("penetration-testing", "Penetration testing", "পেনিট্রেশন টেস্টিং", ["ethical hacking", "kali linux"]),
    ("siem", "SIEM and log analysis", "সিয়েম ও লগ বিশ্লেষণ", ["splunk"]),
    ("incident-response", "Incident response", "ঘটনা মোকাবেলা", ["soc"]),
    ("vulnerability-assessment", "Vulnerability assessment", "দুর্বলতা মূল্যায়ন", ["nessus"]),
    ("security-awareness", "Security awareness training", "নিরাপত্তা সচেতনতা প্রশিক্ষণ", []),
    ("iam", "Identity and access management", "পরিচয় ও অ্যাক্সেস ব্যবস্থাপনা", ["iam", "rbac"]),
]

# -------------------------------------------------------------- education
EDUCATION = [
    ("lesson-planning", "Lesson planning", "পাঠ পরিকল্পনা", []),
    ("classroom-management", "Classroom management", "শ্রেণিকক্ষ ব্যবস্থাপনা", []),
    ("curriculum-development", "Curriculum development", "পাঠ্যক্রম উন্নয়ন", ["syllabus design"]),
    ("student-assessment", "Student assessment", "শিক্ষার্থী মূল্যায়ন", ["exam design", "grading"]),
    ("educational-technology", "Educational technology", "শিক্ষা প্রযুক্তি", ["lms", "google classroom"]),
    ("mentoring", "Mentoring and coaching", "পরামর্শদান ও কোচিং", ["tutoring"]),
    ("subject-expertise", "Subject matter expertise", "বিষয়ভিত্তিক দক্ষতা", ["domain knowledge"]),
    ("online-teaching", "Online teaching", "অনলাইন শিক্ষাদান", ["virtual classrooms", "zoom teaching"]),
    ("differentiated-instruction", "Differentiated instruction", "বিভেদিত শিক্ষাদান", ["remedial teaching"]),
    ("e-learning-content", "E-learning content creation", "ই-লার্নিং কনটেন্ট তৈরি", ["instructional design"]),
    ("public-speaking", "Public speaking", "বক্তৃতা দেওয়া", ["presentation delivery"]),
    ("child-safeguarding", "Child safeguarding", "শিশু সুরক্ষা", ["safeguarding"]),
]

# ------------------------------------------------------------- translation
TRANSLATION = [
    ("en-bn-translation", "English to Bangla translation", "ইংরেজি থেকে বাংলা অনুবাদ", ["bangla translation"]),
    ("bn-typing", "Bangla typing (Avro/Bijoy)", "বাংলা টাইপিং", ["avro", "bijoy", "unicode bangla"]),
    ("subtitling", "Subtitling", "সাবটাইটেলিং", ["captioning"]),
    ("localisation", "Localisation", "স্থানীয়করণ", ["localization"]),
    ("terminology-management", "Terminology management", "পরিভাষা ব্যবস্থাপনা", ["glossaries"]),
    ("cat-tools", "CAT tools", "সিএটি টুলস", ["trados", "memoq"]),
    ("interpreting", "Interpreting", "দোভাষী হিসেবে কাজ", ["consecutive interpreting"]),
    ("transcription-bn", "Bangla transcription", "বাংলা ট্রান্সক্রিপশন", []),
]

# --------------------------------------------------------- project management
PROJECT_MGMT = [
    ("project-planning", "Project planning", "প্রকল্প পরিকল্পনা", ["work breakdown"]),
    ("agile", "Agile methods", "অ্যাজাইল পদ্ধতি", ["agile methodology"]),
    ("scrum", "Scrum", "স্ক্রাম", ["sprints"]),
    ("kanban", "Kanban", "কানবান", []),
    ("jira", "Jira", "জিরা", ["issue tracking"]),
    ("stakeholder-management", "Stakeholder management", "স্টেকহোল্ডার ব্যবস্থাপনা", ["client coordination"]),
    ("project-risk-management", "Project risk management", "প্রকল্প ঝুঁকি ব্যবস্থাপনা", ["risk registers"]),
    ("budget-management", "Budget management", "বাজেট ব্যবস্থাপনা", ["cost control"]),
    ("scheduling", "Scheduling", "সময়সূচি নির্ধারণ", ["gantt", "ms project"]),
    ("status-reporting", "Status reporting", "অগ্রগতি প্রতিবেদন", ["progress reports"]),
    ("facilitation", "Meeting facilitation", "মিটিং পরিচালনা", ["workshops"]),
    ("vendor-coordination", "Vendor coordination", "সরবরাহকারী সমন্বয়", []),
]

# ------------------------------------------------------------- research
RESEARCH = [
    ("literature-review", "Literature review", "সাহিত্য পর্যালোচনা", []),
    ("survey-design", "Survey design", "জরিপ ডিজাইন", ["questionnaire design"]),
    ("qualitative-research", "Qualitative research", "গুণগত গবেষণা", ["interviews", "focus groups"]),
    ("quantitative-research", "Quantitative research", "পরিমাণগত গবেষণা", []),
    ("data-collection", "Field data collection", "মাঠ পর্যায়ে তথ্য সংগ্রহ", ["enumerator", "kobo", "surveycto"]),
    ("sampling", "Sampling methods", "নমুনা নির্বাচন পদ্ধতি", []),
    ("citation-management", "Citation management", "উদ্ধৃতি ব্যবস্থাপনা", ["zotero", "mendeley", "apa"]),
    ("ethical-research", "Research ethics and consent", "গবেষণা নীতিমালা ও সম্মতি", ["irb"]),
]

# -------------------------------------------------------------- journalism
JOURNALISM = [
    ("news-writing", "News writing", "সংবাদ লেখা", ["news reporting"]),
    ("journalistic-interviewing", "Journalistic interviewing", "সাংবাদিক সাক্ষাৎকার", ["source interviewing"]),
    ("fact-checking", "Fact-checking", "তথ্য যাচাই", ["verification"]),
    ("media-ethics", "Media ethics and law", "গণমাধ্যম নীতিমালা ও আইন", ["defamation"]),
    ("video-reporting", "Video reporting", "ভিডিও রিপোর্টিং", ["field reporting"]),
    ("press-releases", "Press releases", "প্রেস রিলিজ", ["media relations"]),
    ("social-newsgathering", "Social media newsgathering", "সোশ্যাল মিডিয়া থেকে সংবাদ সংগ্রহ", []),
    ("editorial-planning", "Editorial planning", "সম্পাদকীয় পরিকল্পনা", ["content calendar"]),
]

# -------------------------------------------------------------- NGO / dev
DEVELOPMENT_SECTOR = [
    ("proposal-development", "Donor proposal development", "দাতা প্রস্তাব প্রণয়ন", ["concept notes"]),
    ("monitoring-evaluation", "Monitoring and evaluation", "পর্যবেক্ষণ ও মূল্যায়ন", ["m&e", "logframe"]),
    ("community-mobilisation", "Community mobilisation", "সম্প্রদায় সংগঠন", ["social mobilisation"]),
    ("field-facilitation", "Field facilitation", "মাঠ পর্যায়ে সহজীকরণ", ["field visits"]),
    ("donor-reporting", "Donor reporting", "দাতা প্রতিবেদন", ["narrative reports"]),
    ("safeguarding", "Safeguarding and PSEA", "সুরক্ষা ও পিএসইএ", ["psea"]),
    ("stakeholder-mapping", "Stakeholder mapping", "স্টেকহোল্ডার ম্যাপিং", []),
    ("training-facilitation", "Training facilitation", "প্রশিক্ষণ সহজীকরণ", ["capacity building"]),
    ("budget-tracking", "Programme budget tracking", "কার্যক্রম বাজেট ট্র্যাকিং", ["burn rate"]),
    ("gender-inclusion", "Gender and social inclusion", "লিঙ্গ ও সামাজিক অন্তর্ভুক্তি", ["gsi"]),
]

# ---------------------------------------------------------------- office
OFFICE = [
    ("ms-word", "Microsoft Word", "মাইক্রোসফট ওয়ার্ড", ["word processing"]),
    ("ms-powerpoint", "Microsoft PowerPoint", "মাইক্রোসফট পাওয়ারপয়েন্ট", ["presentations", "slides"]),
    ("google-workspace", "Google Workspace", "গুগল ওয়ার্কস্পেস", ["google docs", "google drive"]),
    ("email-communication", "Professional email writing", "পেশাদার ইমেইল লেখা", ["email etiquette"]),
    ("typing-speed", "Fast typing (Bangla/English)", "দ্রুত টাইপিং", ["typing"]),
    ("data-entry", "Data entry", "তথ্য প্রবেশ", ["data entry operator"]),
    ("record-keeping", "Record keeping and filing", "রেকর্ড সংরক্ষণ", ["filing"]),
    ("calendar-management", "Calendar and scheduling", "ক্যালেন্ডার ও সময়সূচি", ["appointment scheduling"]),
    ("document-management", "Document management", "ডকুমেন্ট ব্যবস্থাপনা", ["dms"]),
    ("meeting-minutes", "Meeting minutes", "মিটিং মিনিট", ["note taking"]),
]

# ------------------------------------------------------------- soft skills
SOFT_SKILLS = [
    ("communication", "Communication", "যোগাযোগ দক্ষতা", ["verbal communication", "written communication"]),
    ("teamwork", "Teamwork", "দলীয় কাজ", ["collaboration"]),
    ("problem-solving", "Problem solving", "সমস্যা সমাধান", ["analytical thinking"]),
    ("critical-thinking", "Critical thinking", "সমালোচনামূলক চিন্তাভাবনা", []),
    ("adaptability", "Adaptability", "খাপ খাইয়ে নেওয়ার ক্ষমতা", ["flexibility"]),
    ("time-management", "Time management", "সময় ব্যবস্থাপনা", ["prioritisation"]),
    ("leadership", "Leadership", "নেতৃত্ব", ["leading teams"]),
    ("attention-to-detail", "Attention to detail", "বিস্তারিত মনোযোগ", ["accuracy"]),
    ("presentation-skills", "Presentation skills", "উপস্থাপনা দক্ষতা", []),
    ("emotional-intelligence", "Emotional intelligence", "আবেগিক বুদ্ধিমত্তা", ["empathy"]),
    ("work-ethic", "Work ethic and reliability", "কর্মনিষ্ঠা ও নির্ভরযোগ্যতা", ["dependability"]),
    ("creativity", "Creativity", "সৃজনশীলতা", ["innovation"]),
    ("decision-making", "Decision making", "সিদ্ধান্ত গ্রহণ", []),
    ("learning-agility", "Learning agility", "দ্রুত শেখার ক্ষমতা", ["self-learning"]),
    ("stress-management", "Stress management", "মানসিক চাপ ব্যবস্থাপনা", ["resilience"]),
    ("cross-cultural", "Cross-cultural communication", "আন্তঃসাংস্কৃতিক যোগাযোগ", []),
]

CATEGORIES = [
    ("programming", PROGRAMMING),
    ("frontend", FRONTEND),
    ("backend", BACKEND),
    ("databases", DATABASES),
    ("cloud-devops", CLOUD_DEVOPS),
    ("data-science", DATA_SCIENCE),
    ("analytics-bi", ANALYTICS_BI),
    ("design", DESIGN),
    ("media", MEDIA),
    ("writing", WRITING),
    ("marketing", MARKETING),
    ("finance", FINANCE),
    ("banking", BANKING),
    ("hr", HR),
    ("sales", SALES),
    ("customer-service", CUSTOMER_SERVICE),
    ("operations", OPERATIONS),
    ("apparel", APPAREL),
    ("civil-engineering", CIVIL),
    ("electrical-engineering", ELECTRICAL),
    ("network-security", NETWORK_SECURITY),
    ("education", EDUCATION),
    ("translation", TRANSLATION),
    ("project-management", PROJECT_MGMT),
    ("research", RESEARCH),
    ("journalism", JOURNALISM),
    ("development-sector", DEVELOPMENT_SECTOR),
    ("office", OFFICE),
    ("soft-skills", SOFT_SKILLS),
]


def all_skills():
    """Returns [(id, name_en, name_bn, category, aliases)] in a stable order."""
    rows = []
    seen = set()
    for category, entries in CATEGORIES:
        for skill_id, name_en, name_bn, aliases in entries:
            if skill_id in seen:
                raise ValueError(f"Duplicate skill id: {skill_id}")
            seen.add(skill_id)
            rows.append((skill_id, name_en, name_bn, category, list(aliases)))
    return rows
