"""Pydantic request/response models: FastAPI validates every request body against these."""
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

InterviewType = Literal["technical", "hr", "project", "mixed"]
Difficulty = Literal["easy", "medium", "hard"]


class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)

    @field_validator("password")
    @classmethod
    def _bcrypt_limit(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class UserOut(BaseModel):
    id: str
    name: str
    email: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class StartInterviewIn(BaseModel):
    resume_id: str = Field(min_length=24, max_length=24)
    interview_type: InterviewType = "mixed"
    num_questions: int = Field(default=5, ge=3, le=15)
    target_role: str = Field(default="Software engineering", min_length=1, max_length=120)
    topics: list[str] = Field(default_factory=list, max_length=10)
    difficulty: Difficulty = "medium"

    @field_validator("target_role")
    @classmethod
    def _clean_role(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Target role cannot be blank")
        return value

    @field_validator("topics")
    @classmethod
    def _clean_topics(cls, values: list[str]) -> list[str]:
        cleaned = list(dict.fromkeys(topic.strip() for topic in values if topic.strip()))
        if any(len(topic) > 80 for topic in cleaned):
            raise ValueError("Each topic must be at most 80 characters")
        return cleaned


class AnswerIn(BaseModel):
    question_id: str = Field(min_length=24, max_length=24)
    answer_text: str = Field(min_length=1, max_length=4000)
    answer_mode: Literal["text", "transcript"] = "text"


class FinishInterviewIn(BaseModel):
    answer: AnswerIn | None = None


class ArenaRunIn(BaseModel):
    code: str = Field(min_length=1, max_length=30000)
    language: Literal["python", "javascript", "java", "cpp", "c", "sql"]
    stdin: str = Field(default="", max_length=20000)


class ArenaSubmitIn(BaseModel):
    code: str = Field(min_length=1, max_length=30000)
    language: Literal["python", "javascript", "java", "cpp", "c", "sql"]
    contest_id: str | None = None


class ArenaAssistantIn(BaseModel):
    problem_slug: str = Field(min_length=1, max_length=100)
    question: str = Field(min_length=1, max_length=3000)
    code: str = Field(default="", max_length=20000)
    mode: Literal["learn", "practice", "interview", "contest"] = "practice"
    contest_id: str | None = None


class ArenaProblemIn(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=100)
    title: str = Field(min_length=3, max_length=160)
    difficulty: Literal["Easy", "Medium", "Hard"]
    topics: list[str] = Field(min_length=1, max_length=12)
    statement: str = Field(min_length=20, max_length=12000)
    examples: list[dict] = Field(min_length=1, max_length=12)
    constraints: list[str] = Field(min_length=1, max_length=30)
    test_cases: list[dict] = Field(min_length=1, max_length=20)
    starter_code: dict[str, str] = Field(default_factory=dict)
    prerequisites: list[str] = Field(default_factory=list, max_length=20)
    hints: list[str] = Field(default_factory=list, max_length=12)
    editorial: str | None = Field(default=None, max_length=12000)
    published: bool = True


class ArenaContestIn(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=100)
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=10, max_length=5000)
    start_at: str = Field(min_length=20, max_length=40)
    end_at: str = Field(min_length=20, max_length=40)
    problem_slugs: list[str] = Field(min_length=1, max_length=30)
    participation_mode: Literal["individual", "team"] = "individual"
    ai_policy: Literal["disabled", "limited"] = "disabled"
    points_by_difficulty: dict[str, int] = Field(default_factory=lambda: {"Easy": 100, "Medium": 200, "Hard": 300})


class ArenaTeamIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)


class ArenaTeamJoinIn(BaseModel):
    invite_code: str = Field(min_length=6, max_length=32)


class TaskUpdateIn(BaseModel):
    completed: bool


class PrepChecklistItemIn(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    text: str = Field(min_length=1, max_length=180)
    completed: bool = False


class PrepNoteIn(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    title: str = Field(default="", max_length=120)
    body: str = Field(default="", max_length=12000)
    updated_at: str = Field(default="", max_length=40)


class PrepSpaceUpdateIn(BaseModel):
    checklist: list[PrepChecklistItemIn] = Field(default_factory=list, max_length=100)
    notes: list[PrepNoteIn] = Field(default_factory=list, max_length=100)
