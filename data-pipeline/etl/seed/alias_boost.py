"""Surface forms students actually write on a CV, mapped onto taxonomy keys.

The curated skills carry formal names ("Microsoft Excel", "Git / version
control", "Linux administration"). Real CVs, especially Bangladeshi fresher
CVs, write the short form ("Excel", "Git", "Linux"). Without this table the
offline extractor simply does not see those skills.

Entries are verified against the current taxonomy by build_seed.py, which
fails the build if a key is unknown — so this file can never drift.

Rules for adding an entry:
  - The alias must be a real thing a person writes on a CV.
  - It must be unambiguous as a whole word. If it is not ("go", "word"),
    do not add it: a false match is worse than a missed one.
"""

EXTRA_ALIASES: dict[str, list[str]] = {
    # version control
    "git": ["git", "git workflow", "git workflows", "source control"],
    # office / spreadsheets
    "excel": ["excel", "ms excel", "pivot tables", "pivot table", "vlookup", "vba"],
    "ms-word": ["ms word"],
    "ms-powerpoint": ["powerpoint", "ms powerpoint", "ppt"],
    "google-sheets": ["google sheet"],
    "typing-speed": ["typing", "typing speed"],
    "bn-typing": ["bangla typing", "avro typing", "bijoy typing"],
    # testing
    "unit-testing": ["unit tests", "unit test", "unit testing"],
    "manual-testing": ["testing", "software testing", "qa"],
    "regression-testing": ["regression tests", "regression"],
    "test-case-design": ["test cases", "test case writing"],
    "bug-reporting": ["bug reports"],
    # backend / web
    "rest-api": ["rest api", "rest apis", "restful api", "rest api endpoints"],
    # NOTE: bare "express" is deliberately NOT an alias — CVs say "express ideas".
    "express": ["express js", "expressjs"],
    # NOTE: bare "spring" is deliberately NOT an alias — CVs say "Spring 2025".
    "spring": ["spring boot", "spring framework", "spring mvc"],
    "nodejs": ["node js", "nodejs"],
    "graphql": ["graph ql"],
    # cloud / infrastructure
    "aws": ["aws"],
    "gcp": ["google cloud", "gcp"],
    "azure": ["azure", "microsoft azure"],
    "linux": ["linux", "linux server"],
    "bash": ["bash", "bash scripting"],
    "cicd": ["ci/cd", "ci cd", "continuous delivery", "continuous deployment"],
    "nginx": ["nginx", "reverse proxy"],
    "docker": ["docker", "containerisation"],
    # programming languages
    "cpp": ["c plus plus"],
    "csharp": ["csharp"],
    "kotlin": ["kotlin android"],
    "matlab": ["matlab"],
    # mobile
    "android": ["android", "android studio", "android app", "android development"],
    "flutter": ["flutter app"],
    # data
    "data-cleaning": [
        "data analysis",
        "data analytics",
        "analysing data",
        "analyzing data",
        "data interpretation",
    ],
    "statistics": ["stats"],
    "regression": ["regression analysis", "logistic regression"],
    "power-bi": ["power bi", "powerbi"],
    "looker-studio": ["google data studio", "data studio"],
    # finance
    "tally": ["tally"],
    "quickbooks": ["quick books"],
    "financial-modelling": ["financial model", "excel modelling"],
    # marketing
    "digital-marketing": ["digital marketing", "online marketing", "internet marketing"],
    "seo": ["search engine optimisation", "search engine optimization"],
    "google-analytics": ["google analytics"],
    "social-media-marketing": ["social media marketing", "smm"],
    "market-research": ["market research"],
    # sales / service
    # NOTE: bare "sales" is deliberately NOT an alias — it fires on project names
    # like "Sales dashboard".
    "retail-sales": ["retail sales", "showroom sales"],
    "customer-support": ["technical support", "help desk", "it support"],
    "on-call-support": ["on-call"],
    # education / training
    "training-facilitation": ["teaching", "tutoring", "tuition", "training delivery"],
    "curriculum-development": ["curriculum design", "curriculum"],
    "lesson-planning": ["lesson plans"],
    "en-bn-translation": ["translation", "translating", "translate"],
    # management / operations
    "project-planning": ["project management"],
    "agile": ["agile", "agile working"],
    "scrum": ["scrum"],
    "logistics-coordination": [
        "logistics",
        "supply chain",
        "supply chain management",
        "shipping coordination",
    ],
    "networking-basics": ["network security", "computer networks", "network administration"],
    "premiere": ["adobe premiere", "premiere pro"],
    "plc": ["plc programming", "plc"],
}
