"""Skills referenced by occupations but defined outside the main category blocks.

Kept separate so the curated categories stay readable. Same format as skills.py.
"""

EXTRA_SKILLS = [
    # computer science fundamentals
    ("data-structures", "Data structures and algorithms", "ডেটা স্ট্রাকচার ও অ্যালগরিদম",
     "programming", ["dsa", "algorithms"]),
    ("machine-learning", "Machine learning", "মেশিন লার্নিং",
     "data-science", ["ml", "predictive modelling"]),
    ("mlops-monitoring", "Model monitoring and drift detection", "মডেল পর্যবেক্ষণ",
     "data-science", ["drift detection", "model monitoring"]),
    ("data-visualisation", "Data visualisation", "তথ্য ভিজ্যুয়ালাইজেশন",
     "analytics-bi", ["data viz", "charts"]),
    ("cloud-basics", "Cloud platform basics", "ক্লাউড প্ল্যাটফর্ম মৌলিক",
     "cloud-devops", ["cloud fundamentals"]),

    # testing
    ("manual-testing", "Manual testing", "ম্যানুয়াল টেস্টিং",
     "backend", ["exploratory testing"]),
    ("test-automation", "Test automation", "টেস্ট অটোমেশন",
     "backend", ["automation testing"]),
    ("test-case-design", "Test case design", "টেস্ট কেস ডিজাইন",
     "backend", ["test design"]),
    ("api-testing", "API testing", "এপিআই টেস্টিং",
     "backend", ["postman"]),
    ("regression-testing", "Regression testing", "রিগ্রেশন টেস্টিং",
     "backend", []),
    ("bug-reporting", "Bug reporting", "বাগ রিপোর্টিং",
     "backend", ["defect reporting"]),
    ("selenium", "Selenium", "সেলেনিয়াম",
     "backend", []),
    ("cypress", "Cypress", "সাইপ্রেস",
     "backend", ["playwright"]),

    # mobile
    ("flutter", "Flutter", "ফ্লাটার",
     "frontend", ["react native"]),
    ("mobile-ui", "Mobile UI patterns", "মোবাইল ইউআই প্যাটার্ন",
     "design", ["material design", "ios human interface"]),
    ("app-store-publishing", "App store publishing", "অ্যাপ স্টোরে প্রকাশ",
     "frontend", ["play store", "app store connect"]),

    # design / UX
    ("usability-testing", "Usability testing", "ব্যবহারযোগ্যতা পরীক্ষা",
     "design", []),
    ("interaction-design", "Interaction design", "ইন্টারঅ্যাকশন ডিজাইন",
     "design", ["ixd"]),
    ("user-journeys", "User journey mapping", "ব্যবহারকারী যাত্রা মানচিত্র",
     "design", ["customer journey"]),
    ("social-media-design", "Social media design", "সোশ্যাল মিডিয়া ডিজাইন",
     "design", []),
    ("feedback-handling", "Handling design feedback", "ডিজাইন ফিডব্যাক গ্রহণ",
     "soft-skills", ["client revisions"]),
    ("html-css-basics", "HTML and CSS basics", "এইচটিএমএল ও সিএসএস মৌলিক",
     "frontend", []),

    # writing
    ("grammar", "Grammar and style", "ব্যাকরণ ও শৈলী",
     "writing", ["english grammar", "bangla grammar"]),
    ("research", "Research skills", "গবেষণা দক্ষতা",
     "research", ["desktop research", "online research"]),
    ("cms-basic", "CMS publishing (WordPress)", "সিএমএসে প্রকাশনা",
     "writing", ["wordpress", "content management system"]),
    ("cultural-nuance", "Cultural nuance in language", "ভাষায় সাংস্কৃতিক সূক্ষ্মতা",
     "translation", []),

    # finance
    ("valuation", "Business valuation", "ব্যবসা মূল্যায়ন",
     "finance", ["dcf", "company valuation"]),
    ("ifrs-standards", "IFRS application", "আইএফআরএস প্রয়োগ",
     "finance", ["international financial reporting standards"]),
    ("cross-selling", "Cross-selling", "ক্রস-সেলিং",
     "sales", []),

    # RMG
    ("time-and-action", "Time and action calendar", "টাইম অ্যান্ড অ্যাকশন ক্যালেন্ডার",
     "apparel", ["tna"]),
    ("line-balancing", "Line balancing", "লাইন ব্যালেন্সিং",
     "apparel", ["operation breakdown"]),

    # IT ops
    ("on-call-support", "On-call support", "অন-কল সাপোর্ট",
     "network-security", ["on-call rotation"]),

    # mobile platforms (added after the CV recall audit)
    ("android", "Android development", "অ্যান্ড্রয়েড ডেভেলপমেন্ট",
     "frontend", ["android", "android studio", "android app", "android development"]),

    # marketing umbrella term students actually write (added after the audit)
    ("digital-marketing", "Digital marketing", "ডিজিটাল মার্কেটিং",
     "marketing", ["digital marketing", "online marketing", "internet marketing"]),

    # general / professional
    ("crm-basic", "CRM tools", "সিআরএম টুলস",
     "office", ["crm", "salesforce", "hubspot crm"]),
    ("confidentiality", "Handling confidential information", "গোপনীয় তথ্য পরিচালনা",
     "soft-skills", ["data confidentiality"]),
    ("basic-english", "Working English", "কাজের মতো ইংরেজি",
     "soft-skills", ["functional english", "spoken english"]),
    ("persuasion", "Persuasion", "রাজি করানোর ক্ষমতা",
     "soft-skills", ["influencing"]),
    ("resilience", "Resilience", "ধৈর্য ও সহনশীলতা",
     "soft-skills", ["grit"]),
    ("patience", "Patience", "ধৈর্য",
     "soft-skills", []),
    ("curiosity", "Curiosity", "জিজ্ঞাসু মনোভাব",
     "soft-skills", []),
    ("data-driven", "Data-driven decision making", "তথ্যভিত্তিক সিদ্ধান্ত",
     "soft-skills", []),
    ("domain-knowledge", "Industry domain knowledge", "শিল্পখাত সংক্রান্ত জ্ঞান",
     "soft-skills", ["business domain"]),
]
