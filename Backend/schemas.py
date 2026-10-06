from pydantic import BaseModel, Field
from typing import List, Optional

# --- 0. Highlight Region on a PDF/slide page ---
class BoundingBox(BaseModel):
    """Normalized page coordinates (0-1), origin at the TOP-LEFT of the page.
    From PyMuPDF: x0=rect.x0/page.rect.width, y0=rect.y0/page.rect.height, etc."""
    x0: float = Field(..., ge=0, le=1)
    y0: float = Field(..., ge=0, le=1)
    x1: float = Field(..., ge=0, le=1)
    y1: float = Field(..., ge=0, le=1)

# --- 1. Source Attribution Metadata ---
class SourceMetadata(BaseModel):
    file_name: str = Field(..., description="Name of the slide, PDF, or video file")
    page_number: Optional[int] = Field(None, description="Page number for slides/textbooks")
    start_time: Optional[str] = Field(None, description="Start timestamp for video (e.g. 02:15)")
    end_time: Optional[str] = Field(None, description="End timestamp for video (e.g. 02:45)")
    bboxes: Optional[List[BoundingBox]] = Field(None, description="Regions on page_number to highlight")

# --- 2. Context Chunk from Member 1's Vector DB ---
class ContextChunk(BaseModel):
    chunk_id: str = Field(..., description="Unique ID of the retrieved vector chunk")
    text: str = Field(..., description="Text excerpt from the material")
    metadata: SourceMetadata

# --- 3. Request Body sent from Member 3's Frontend ---
class ChatRequest(BaseModel):
    query: str = Field(..., description="User's question")
    retrieved_contexts: List[ContextChunk] = Field(default=[], description="Context chunks passed from DB")

# --- 4. Formatted Citation Object ---
class Citation(BaseModel):
    chunk_id: str
    file_name: str
    page_number: Optional[int] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    bboxes: Optional[List[BoundingBox]] = None

# --- 5. Final Response sent back to Frontend ---
class ChatResponse(BaseModel):
    answer: str = Field(..., description="Generated answer with inline citations")
    citations: List[Citation] = Field(default=[], description="List of validated citation objects")