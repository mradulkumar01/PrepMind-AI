"""Role-first company practice tracks based on public employer career guidance.

These are broad practice themes, not a claim about an exact or guaranteed interview loop.
The user should check the current job posting and recruiter instructions for each role.
"""

TRACKS = {
    "general": {
        "name": "General software engineering",
        "summary": "Role- and resume-led practice with core CS, coding, communication, and project discussion.",
        "topics": ["data structures and algorithms", "SQL and database design", "operating systems", "networking and APIs", "project trade-offs", "debugging and testing"],
        "guidance": "Generate original role-relevant practice questions. Ask the candidate to clarify assumptions, explain a solution, test edge cases, and discuss complexity. Do not claim this is a company's actual interview format.",
        "source_url": "",
    },
    "tcs": {
        "name": "TCS",
        "summary": "Foundation aptitude/reasoning and role-selected technical skill, with coding practice for advanced pathways.",
        "topics": ["chosen technical skill", "coding and algorithms", "quantitative reasoning", "verbal communication", "project fundamentals", "core CS"],
        "guidance": "For entry-level preparation, combine foundation-style quantitative, reasoning, and verbal practice with the candidate's selected technical skill and original coding exercises. TCS publishes pathway-specific test guidance; do not imply every role has the same test or rounds.",
        "source_url": "https://www.tcs.com/careers/india/tcs-all-india-nqt-hiring",
    },
    "infosys": {
        "name": "Infosys",
        "summary": "Skill-led technical preparation, coding rounds, and live coding practice for advanced programmer tracks.",
        "topics": ["data structures and algorithms", "live coding and debugging", "chosen technical skill", "project deep dive", "computer science fundamentals", "communication"],
        "guidance": "Emphasize original coding exercises, clear reasoning, and the selected role's technical area. Infosys describes coding rounds and live technical coding for its Power Programmer pathway; other roles can differ.",
        "source_url": "https://www.infosys.com/careers/power-programmers.html",
    },
    "accenture": {
        "name": "Accenture",
        "summary": "Role-aligned applied problem solving, technical assessment practice, and structured experience discussion.",
        "topics": ["applied coding", "logical problem solving", "role-specific technologies", "project outcomes", "communication", "situational judgment"],
        "guidance": "Use practical, role-aligned scenarios. Ask the candidate to explain how they structure a solution and apply technical knowledge, then discuss a relevant experience. Accenture says assessment content and steps depend on role.",
        "source_url": "https://www.accenture.com/us-en/careers/explore-careers/area-of-interest/journey-to-accenture",
    },
    "ibm": {
        "name": "IBM",
        "summary": "Structured role-based technical and behavioral practice, with coding exercises where relevant.",
        "topics": ["role-specific technical skills", "coding and debugging", "behavioral examples", "project outcomes", "problem-solving explanation", "career motivation"],
        "guidance": "Use structured behavioral questions tied to role-relevant skills and outcomes, alongside technical questions or coding exercises appropriate to the selected role. Do not invent a fixed number of rounds.",
        "source_url": "https://www.ibm.com/careers/application-process",
    },
    "cognizant": {
        "name": "Cognizant",
        "summary": "Role-specific technical assessment, communication, and project or client-scenario discussion.",
        "topics": ["role-specific technical skills", "aptitude and reasoning", "communication", "project explanation", "client scenarios", "coding fundamentals"],
        "guidance": "Practice communication, aptitude or technical fundamentals as appropriate to the target role, then discuss a project or client-style scenario. Cognizant notes that assessments and client interviews may vary by role.",
        "source_url": "https://careers.cognizant.com/india-en/pathways-to-cognizant/how-we-hire/",
    },
    "amazon": {
        "name": "Amazon",
        "summary": "Coding, data structures and algorithms, CS fundamentals, system design by level, and evidence-based behavioral examples.",
        "topics": ["data structures and algorithms", "coding, testing and edge cases", "databases and operating systems", "system design by role level", "reliability and scalability", "behavioral examples"],
        "guidance": "For software-development practice, emphasize syntactically correct code, fundamentals, testing, edge cases, and efficiency. Add system-design depth according to role and experience; include concrete behavioral examples. Amazon's official materials say topics and loop vary by role.",
        "source_url": "https://www.amazon.jobs/content/en/how-we-hire/interview-prep/software-development-topics",
    },
    "google": {
        "name": "Google",
        "summary": "Explain problem-solving aloud, clarify assumptions, code clearly, test edge cases, and optimize; system design depends on role.",
        "topics": ["data structures and algorithms", "clarifying assumptions", "coding and testing", "complexity and optimization", "graphs and recursion", "system design by role"],
        "guidance": "Ask the candidate to speak through assumptions and decisions, outline an algorithm, write readable code, test edge cases, and refine the solution. Use system-design depth only when relevant to the role. These are practice themes, not promised interview questions.",
        "source_url": "https://blog.google/company-news/inside-google/life-at-google/google-engineer-shares-her-technical-interview-tips/",
    },
}


def public_tracks() -> list[dict]:
    return [{"id": key, **value} for key, value in TRACKS.items()]
