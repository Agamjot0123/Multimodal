from pydantic import BaseModel, Field
from typing import List, Optional

# --- Source Attribution Metadata ---
class SourceMetadata(BaseModel):
    file_name: str = Field(..., description="Name of the slide, PDF, or video file")
    page_number: Optional[int] = Field(None, description="Page number for slides/textbooks")
    start_time: Optional[str] = Field(None, description="Start timestamp for video (e.g. 02:15)")
    end_time: Optional[str] = Field(None, description="End timestamp for video (e.g. 02:45)")

# --- Context Chunk from Member 1's Vector DB ---
class ContextChunk(BaseModel):
    chunk_id: str = Field(..., description="Unique ID of the retrieved vector chunk")
    text: str = Field(..., description="Text excerpt from the material")
    metadata: SourceMetadata

# --- Chat Request & Response ---
class ChatRequest(BaseModel):
    query: str = Field(..., description="User's question")
    retrieved_contexts: List[ContextChunk] = Field(default=[], description="Context chunks passed from DB")

class Citation(BaseModel):
    chunk_id: str
    file_name: str
    page_number: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str = Field(..., description="Generated answer with inline citations")
    citations: List[Citation] = Field(default=[], description="List of validated citation objects")

# --- Day 9: Adaptive Quiz Schemas ---
class QuizRequest(BaseModel):
    retrieved_contexts: List[ContextChunk] = Field(..., description="Context chunks to base quiz on")
    num_questions: int = Field(default=3, description="Number of quiz questions to generate")

class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[str]
    correct_option_index: int
    explanation: str
    source_citation: str

class QuizResponse(BaseModel):
    questions: List[QuizQuestion]