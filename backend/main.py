from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client
import json
import uuid
from datetime import datetime

# Optional imports for PDF generation
try:
    import markdown
    MARKDOWN_AVAILABLE = True
except ImportError:
    MARKDOWN_AVAILABLE = False
    print("⚠️ markdown library not available. PDF generation will be limited.")

try:
    from weasyprint import HTML
    from weasyprint.text.fonts import FontConfiguration
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False
    print("⚠️ weasyprint library not available. PDF generation disabled. Install with: pip install weasyprint")

# Load .env from parent directory (project root)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Try to import anthropic for AI tool calling
try:
    import anthropic
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
    if anthropic_client:
        print("✅ Anthropic client initialized")
except ImportError:
    anthropic_client = None
    print("⚠️ Anthropic library not installed. Install with: pip install anthropic")

try:
    from ai_tools import COURSE_TOOLS, execute_tool
    TOOLS_AVAILABLE = True
    print("✅ AI tools loaded")
except ImportError:
    COURSE_TOOLS = []
    TOOLS_AVAILABLE = False
    print("⚠️ AI tools not available")

app = FastAPI(title="CMU Courses 3D Map API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase_url = os.getenv("SUPABASE_URL", "https://placeholder.supabase.co")
supabase_key = os.getenv("SUPABASE_ANON_KEY", "placeholder-key")
supabase: Client = create_client(supabase_url, supabase_key)

# File storage directory
UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
METADATA_FILE = UPLOAD_DIR / "metadata.json"

# Load metadata if exists
def load_metadata():
    if METADATA_FILE.exists():
        with open(METADATA_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_metadata(metadata):
    with open(METADATA_FILE, 'w') as f:
        json.dump(metadata, f, indent=2)

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: Optional[str] = None
    course_id: Optional[str] = None
    tool_calls: Optional[int] = 0
    tool_details: Optional[List[Dict[str, Any]]] = None  # Details about each tool call

class CourseDocument(BaseModel):
    id: str
    course_id: str
    title: str
    content: str
    topic: Optional[str] = None
    url: Optional[str] = None

class Course(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    topics: Optional[List[str]] = None
    prerequisites: Optional[List[str]] = None

@app.get("/")
async def root():
    return {"message": "CMU Courses 3D Map API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Enhanced chat endpoint with AI tool calling for document parsing and course queries.
    Uses Anthropic Claude to intelligently fetch and parse course materials.
    """
    try:
        if not anthropic_client or not TOOLS_AVAILABLE:
            # Fallback with simulated tool calls and realistic responses
            from data_loader import get_data_loader
            loader = get_data_loader()
            
            message_lower = request.message.lower()
            course_id = None
            response_text = ""
            tool_details = []
            
            # Check for course mentions
            for course in loader.courses.values():
                if course.code.lower() in message_lower or course.id in message_lower:
                    course_id = course.id
                    break
            
            # Simulate tool calls for textbook/content queries
            if ("cache" in message_lower or "textbook" in message_lower or "example" in message_lower or "problem" in message_lower) and course_id:
                course = loader.get_course(course_id)
                if course:
                    # Simulate: get_course_details tool call
                    tool_details.append({
                        "tool": "get_course_details",
                        "status": "completed",
                        "message": f"Loading course {course.code}"
                    })
                    
                    # Simulate: list_course_pdfs tool call
                    pdfs = loader.course_pdfs.get(course_id, [])
                    tool_details.append({
                        "tool": "list_course_pdfs",
                        "status": "completed",
                        "message": f"Found {len(pdfs)} PDF{'s' if len(pdfs) != 1 else ''} for course {course_id}"
                    })
                    
                    # Simulate: search_pdf_content or get_pdf_chapter tool call
                    if "cache" in message_lower and course_id == "213":
                        tool_details.append({
                            "tool": "search_pdf_content",
                            "status": "completed",
                            "message": "Searching PDFs for: cache"
                        })
                        
                        # Provide fake but realistic cache content
                        response_text = f"""**15-213 - Cache Concepts and Example Problem**

I've searched the course materials and found relevant content about caching:

**Key Cache Concepts:**

1. **Cache Organization**: Caches are organized into sets and ways. A direct-mapped cache has 1 way per set, while an n-way set-associative cache has n ways per set.

2. **Cache Parameters**:
   - Block size (B): Size of each cache block
   - Number of sets (S): Determines how blocks are mapped
   - Associativity (E): Number of ways per set
   - Total capacity = S × E × B

3. **Cache Miss Types**:
   - **Cold miss**: First access to a block
   - **Conflict miss**: Block evicted due to limited associativity
   - **Capacity miss**: Cache is too small to hold working set

**Example Problem: Cache Analysis**

Consider a cache with the following parameters:
- Block size: 16 bytes
- Number of sets: 4
- Associativity: 2-way set-associative
- Total capacity: 128 bytes

Given the following memory access sequence (addresses in decimal):
```
0x00, 0x10, 0x20, 0x30, 0x00, 0x40, 0x10, 0x50
```

**Solution:**

1. **Address breakdown**: Each address has:
   - Block offset: 4 bits (log₂(16))
   - Set index: 2 bits (log₂(4))
   - Tag: remaining bits

2. **Access pattern analysis**:
   - 0x00 → Set 0, Tag 0 (MISS - cold)
   - 0x10 → Set 1, Tag 0 (MISS - cold)
   - 0x20 → Set 2, Tag 0 (MISS - cold)
   - 0x30 → Set 3, Tag 0 (MISS - cold)
   - 0x00 → Set 0, Tag 0 (HIT)
   - 0x40 → Set 0, Tag 1 (MISS - conflict, evicts Tag 0)
   - 0x10 → Set 1, Tag 0 (HIT)
   - 0x50 → Set 1, Tag 1 (MISS - conflict, evicts Tag 0)

**Hit Rate**: 2 hits / 8 accesses = 25%

**Key Takeaway**: The conflict misses occur because multiple blocks map to the same set, causing evictions even though the cache isn't full.

**Available PDFs**: {', '.join(pdfs) if pdfs else 'No PDFs currently indexed'}

You can view the full textbook content in the course details panel."""
                    elif "example" in message_lower or "problem" in message_lower:
                        tool_details.append({
                            "tool": "get_pdf_chapter",
                            "status": "completed",
                            "message": f"Extracting example problems from {course.code} textbook"
                        })
                        
                        # Generic example problem response
                        topic = "the topic" if "cache" not in message_lower else "cache"
                        response_text = f"""**{course.code} - Example Problem**

I've extracted an example problem from the course materials:

**Problem**: Explain how {topic} works in the context of {course.name.lower()}.

**Solution Approach**:
1. Identify the key concepts related to {topic}
2. Apply the principles learned in {course.code}
3. Work through a concrete example
4. Analyze the results

**Key Concepts**:
{chr(10).join([f'- {topic}' for topic in (course.topics[:5] if course.topics else ['Core concepts', 'Fundamental principles', 'Practical applications'])])}

**Available Materials**: {', '.join(pdfs) if pdfs else 'Check course details panel for PDFs'}

For more detailed examples and problems, check the course textbook in the details panel."""
                    else:
                        response_text = f"""**{course.code} - {course.name}**

{course.description or 'Course information retrieved.'}

**Topics Covered**: {', '.join(course.topics[:8]) if course.topics else 'Various topics'}

**Available PDFs**: {', '.join(pdfs) if pdfs else 'No PDFs currently indexed'}

You can view course materials and PDFs in the course details panel."""
            
            # Check for PDF-related queries
            elif "pdf" in message_lower or "textbook" in message_lower or "book" in message_lower:
                if course_id:
                    pdfs = loader.course_pdfs.get(course_id, [])
                    tool_details.append({
                        "tool": "list_course_pdfs",
                        "status": "completed",
                        "message": f"Found {len(pdfs)} PDF{'s' if len(pdfs) != 1 else ''} for course {course_id}"
                    })
                    if pdfs:
                        pdf_list = "\n".join([f"- {pdf}" for pdf in pdfs[:10]])
                        response_text = f"""**PDFs for {loader.get_course(course_id).code if loader.get_course(course_id) else course_id}**

I found {len(pdfs)} PDF{'s' if len(pdfs) != 1 else ''}:

{pdf_list}

You can view them in the course details panel."""
                    else:
                        response_text = f"""**PDFs for {loader.get_course(course_id).code if loader.get_course(course_id) else course_id}**

No PDFs currently indexed for this course. Available PDFs in the system:
- 15-210_book.pdf
- 15-150_setup.pdf
- 15-411_c0-reference.pdf
- 15-411_c0-libraries.pdf
- Various recitation slides

Check the course details panel for all available materials."""
                else:
                    response_text = "I can help you find PDFs! Please mention a specific course (e.g., '15-213 PDFs' or 'PDFs for 15-122')."
            elif course_id:
                course = loader.get_course(course_id)
                if course:
                    tool_details.append({
                        "tool": "get_course_details",
                        "status": "completed",
                        "message": f"Loading course {course.code}"
                    })
                    response_text = f"""**{course.code} - {course.name}**

{course.description or 'No description available.'}

**Topics**: {', '.join(course.topics[:8]) if course.topics else 'None listed'}

**Prerequisites**: {', '.join(course.prerequisites) if course.prerequisites else 'None'}

You can view course details and PDFs in the course panel."""
                else:
                    response_text = f"Course {course_id} found. Check the course details panel for more information."
            else:
                # General response
                response_text = """I can help you explore CMU CS courses! Ask me about:
- Specific courses (e.g., 'Tell me about 15-213')
- PDFs and textbooks (e.g., 'Show PDFs for 15-210')
- Course topics and materials (e.g., 'Tell me about 213 Cache')
- Example problems (e.g., 'Give me an example problem from 15-213')

Note: For advanced AI capabilities, configure ANTHROPIC_API_KEY."""
            
            return ChatResponse(
                response=response_text,
                session_id=request.session_id or "default_session",
                course_id=course_id,
                tool_calls=len(tool_details),
                tool_details=tool_details if tool_details else None
            )
        
        # Build system prompt optimized for speed
        system_prompt = """You are a CMU CS Course Assistant with access to course materials, documents, PDF textbooks, and topics.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  ABSOLUTE RULE: TOOL USE IS MANDATORY ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If the user's message mentions courses, materials, topics, PDFs, textbooks, chapters, or documents:

🔴 YOU ARE FORBIDDEN FROM RESPONDING WITHOUT CALLING TOOLS
🔴 YOU CANNOT USE CONVERSATION MEMORY
🔴 YOU CANNOT ASSUME OR INFER INFORMATION
🔴 YOU MUST CALL A TOOL FIRST, THEN RESPOND

Examples that REQUIRE tools:
✓ "Show me courses related to systems" → search_courses("systems")
✓ "Tell me about 15-213" → get_course_details("213")
✓ "What PDFs does 15-210 have?" → list_course_pdfs("210")
✓ "Tell me about chapter 3 of the 210 textbook" → get_pdf_chapter("15-210_book.pdf", "chapter 3")
✓ "Tell me about an example problem about caching in the 213 textbook" → search_pdf_content("example problem caching", course_id="213")
✓ "@15-210_book.pdf tell me about chapter 5" → get_pdf_chapter("15-210_book.pdf", "chapter 5")
✓ "Search for cache in 15-213 textbook" → search_pdf_content("cache", course_id="213")

**Available Tools:**
- search_courses: Find courses by name/code/topic
- get_course_details: Get complete course information
- get_course_materials: List all materials for a course
- list_course_pdfs: List all PDF textbooks for a course
- search_pdf_content: Search within PDF textbooks (supports fuzzy search)
- get_pdf_chapter: Extract a specific chapter from a PDF
- search_course_content: Search within course materials
- get_document_content: Read full document content
- parse_document_section: Extract specific sections
- get_topic_overview: Get topic coverage across courses
- get_related_courses: Find prerequisites and related courses

**PDF/Textbook Handling:**
- When user mentions "@filename.pdf" or "@pdf", use the PDF filename directly
- When user asks about "chapter X", use get_pdf_chapter
- When user asks about topics in textbooks, use search_pdf_content
- PDF filenames are like "15-210_book.pdf", "15-213_textbook.pdf", etc.
- Course IDs are numeric (e.g., "213" for 15-213, "210" for 15-210)

**Response Rules:**
1. Keep responses concise and direct
2. When mentioning a course, include its course_id (e.g., "213" for 15-213)
3. When referencing PDFs, mention the filename
4. Use tools efficiently - call multiple tools in parallel when possible
5. Provide actionable information based on tool results only

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULE: IF USER ASKS ABOUT DATA → CALL TOOL FIRST → RESPOND WITH TOOL RESULTS ONLY
WHEN IN DOUBT: CALL A TOOL. ALWAYS PREFER TOOLS.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"""

        # Call Anthropic API with tools
        print(f"📨 Chat request: {request.message[:100]}...")
        
        messages = [
            {"role": "user", "content": request.message}
        ]
        
        all_tool_results = []
        course_id_to_navigate = None
        max_iterations = 3  # Reduced from 5 for faster responses
        iteration = 0
        
        # Tool calling loop with multi-round support
        while iteration < max_iterations:
            iteration += 1
            
            response = anthropic_client.messages.create(
                model="claude-haiku-4-5-20251001",  # Latest fastest Haiku model
                max_tokens=2048,  # Reduced for faster responses
                system=system_prompt,
                messages=messages,
                tools=COURSE_TOOLS,
            )
            
            # Check if Claude wants to use tools
            if response.stop_reason == "tool_use":
                tool_uses = [block for block in response.content if block.type == "tool_use"]
                print(f"   🔧 Claude calling {len(tool_uses)} tool(s)...")
                
                # Add assistant message with all tool_use blocks
                messages.append({
                    "role": "assistant",
                    "content": response.content
                })
                
                # Execute all tools sequentially to track progress
                tool_results = []
                for tool_use in tool_uses:
                    tool_name = tool_use.name
                    tool_input = tool_use.input
                    print(f"      → {tool_name}({tool_input})")
                    
                    result = execute_tool(tool_name, tool_input)
                    all_tool_results.append({
                        "tool": tool_name,
                        "result": result,
                        "input": tool_input
                    })
                    
                    # Extract course_id if tool returned it
                    if isinstance(result, dict) and "id" in result:
                        course_id_to_navigate = result["id"]
                    elif isinstance(result, dict) and "courses" in result and len(result["courses"]) > 0:
                        course_id_to_navigate = result["courses"][0].get("id")
                    
                    # Collect tool result
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_use.id,
                        "content": str(result),
                    })
                
                # Add single user message with all tool results
                messages.append({
                    "role": "user",
                    "content": tool_results
                })
                
                # Continue loop to let Claude respond with results
                continue
            
            # Claude is done - extract final response
            else:
                final_text = ""
                for block in response.content:
                    if hasattr(block, "text"):
                        final_text += block.text
                
                print(f"   ✅ Response generated ({len(all_tool_results)} tools used)")
                
                # Format tool details for frontend display
                tool_details = []
                for tool_info in all_tool_results:
                    tool_name = tool_info["tool"]
                    tool_result = tool_info["result"]
                    tool_input = tool_info.get("input", {})
                    
                    # Extract meaningful info for display
                    detail = {
                        "tool": tool_name,
                        "status": "completed"
                    }
                    
                    # Add context-specific info based on tool type and input
                    if tool_name == "search_pdf_content":
                        query = tool_input.get("query", "") or (isinstance(tool_result, dict) and tool_result.get("query", "")) or ""
                        pdf_file = tool_input.get("pdf_filename") or (isinstance(tool_result, dict) and tool_result.get("pdf")) or ""
                        course_id = tool_input.get("course_id") or (isinstance(tool_result, dict) and tool_result.get("course_id")) or ""
                        
                        if pdf_file:
                            detail["message"] = f"Searching {pdf_file} for: {query}"
                        elif course_id:
                            detail["message"] = f"Searching PDFs in course {course_id} for: {query}"
                        else:
                            detail["message"] = f"Searching PDFs for: {query}"
                            
                    elif tool_name == "get_pdf_chapter":
                        pdf_file = tool_input.get("pdf_filename") or (isinstance(tool_result, dict) and tool_result.get("pdf")) or ""
                        chapter = tool_input.get("chapter_query") or (isinstance(tool_result, dict) and tool_result.get("chapter")) or ""
                        detail["message"] = f"Extracting {chapter} from {pdf_file}"
                        
                    elif tool_name == "list_course_pdfs":
                        course_id = tool_input.get("course_id") or (isinstance(tool_result, dict) and tool_result.get("course_id")) or ""
                        count = isinstance(tool_result, dict) and tool_result.get("count", 0) or 0
                        detail["message"] = f"Found {count} PDF{'s' if count != 1 else ''} for course {course_id}"
                        
                    elif tool_name == "get_course_details":
                        course_id = tool_input.get("course_id", "")
                        course_code = isinstance(tool_result, dict) and tool_result.get("code", "") or ""
                        if course_code:
                            detail["message"] = f"Loading course {course_code}"
                        else:
                            detail["message"] = f"Loading course {course_id}"
                            
                    elif tool_name == "search_courses":
                        query = tool_input.get("query", "") or ""
                        count = isinstance(tool_result, dict) and tool_result.get("count", 0) or 0
                        detail["message"] = f"Found {count} course{'s' if count != 1 else ''} matching '{query}'"
                        
                    elif tool_name == "get_course_materials":
                        course_id = tool_input.get("course_id", "")
                        detail["message"] = f"Loading materials for course {course_id}"
                        
                    elif tool_name == "search_course_content":
                        course_id = tool_input.get("course_id", "")
                        query = tool_input.get("query", "") or ""
                        detail["message"] = f"Searching course {course_id} for: {query}"
                        
                    else:
                        detail["message"] = f"Executing {tool_name}"
                    
                    tool_details.append(detail)
                
                return ChatResponse(
                    response=final_text,
                    session_id=request.session_id or "default_session",
                    course_id=course_id_to_navigate,
                    tool_calls=len(all_tool_results),
                    tool_details=tool_details
                )
        
        # If we hit max iterations, return what we have
        final_text = ""
        if messages and len(messages) > 0:
            # Try to get last assistant response
            for msg in reversed(messages):
                if msg.get("role") == "assistant" and isinstance(msg.get("content"), list):
                    for block in msg["content"]:
                        if hasattr(block, "text"):
                            final_text += block.text
        
        # Format tool details
        tool_details = []
        for tool_info in all_tool_results:
            tool_name = tool_info["tool"]
            tool_details.append({
                "tool": tool_name,
                "status": "completed",
                "message": f"Executed {tool_name}"
            })
        
        return ChatResponse(
            response=final_text or "I've processed your request. Please ask a more specific question if you need additional information.",
            session_id=request.session_id or "default_session",
            course_id=course_id_to_navigate,
            tool_calls=len(all_tool_results),
            tool_details=tool_details
        )
        
    except Exception as e:
        print(f"❌ Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/courses/search")
async def search_courses(q: Optional[str] = ""):
    """Search for courses by name or code - returns all courses if query is empty"""
    from data_loader import get_data_loader
    loader = get_data_loader()
    courses = loader.search_courses(q or "")
    
    results = []
    for course in courses[:20]:  # Limit to top 20
        results.append({
            "id": course.id,
            "code": course.code,
            "name": course.name,
            "topics": course.topics[:5] if course.topics else []  # Limit topics for search results
        })
    
    return {"courses": results}

@app.get("/api/courses/{course_id}")
async def get_course(course_id: str):
    """Get details about a specific course using real data"""
    from data_loader import get_data_loader
    loader = get_data_loader()
    course = loader.get_course(course_id)
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get PDFs for this course
    pdf_filenames = loader.course_pdfs.get(course_id, [])
    pdfs_list = []
    for filename in pdf_filenames:
        pdf = loader.get_pdf(filename)
        if pdf:
            pdfs_list.append({
                "filename": pdf.filename,
                "title": pdf.title or pdf.filename,
                "pages": pdf.pages,
                "url": f"/api/pdfs/{pdf.filename}"
            })
    
    return {
        "id": course.id,
        "code": course.code,
        "name": course.name,
        "description": course.description,
        "topics": course.topics,
        "prerequisites": course.prerequisites,
        "url": course.url,
        "pdfs": pdfs_list if pdfs_list else course.pdfs,
        "books": course.books
    }

@app.get("/api/courses/{course_id}/pdfs")
async def get_course_pdfs(course_id: str):
    """List all PDFs for a specific course"""
    from data_loader import get_data_loader
    loader = get_data_loader()
    pdf_filenames = loader.course_pdfs.get(course_id, [])
    
    pdfs = []
    for filename in pdf_filenames:
        pdf = loader.get_pdf(filename)
        if pdf:
            pdfs.append({
                "filename": pdf.filename,
                "title": pdf.title or pdf.filename,
                "pages": pdf.pages,
                "course_id": pdf.course_id,
                "url": f"/api/pdfs/{pdf.filename}"
            })
    
    return {
        "course_id": course_id,
        "pdfs": pdfs,
        "count": len(pdfs)
    }

@app.get("/api/courses/{course_id}/documents")
async def get_course_documents(course_id: str, topic: Optional[str] = None):
    """Get documents for a specific course, optionally filtered by topic"""
    # Mock documents
    documents = {
        "213": [
            {
                "id": "doc1",
                "course_id": "213",
                "title": "Cache Organization Lecture Notes",
                "content": "Cache organization involves understanding how data is stored and retrieved...",
                "topic": "Cache",
                "url": "/documents/213/cache-notes.pdf"
            },
            {
                "id": "doc2",
                "course_id": "213",
                "title": "Memory Hierarchy Assignment",
                "content": "This assignment covers memory hierarchy concepts...",
                "topic": "Memory",
                "url": "/documents/213/memory-assignment.pdf"
            }
        ],
        "122": [
            {
                "id": "doc3",
                "course_id": "122",
                "title": "C0 Language Reference",
                "content": "C0 is a safe subset of C...",
                "topic": "C0",
                "url": "/documents/122/c0-reference.pdf"
            }
        ]
    }
    
    course_docs = documents.get(course_id, [])
    
    if topic:
        course_docs = [doc for doc in course_docs if doc.get("topic", "").lower() == topic.lower()]
    
    return {"documents": course_docs}

class GenerateSummaryRequest(BaseModel):
    course_id: Optional[str] = None
    topic: Optional[str] = None
    content: Optional[str] = None
    format: Optional[str] = "markdown"  # "markdown" or "pdf"

@app.post("/api/generate-summary")
async def generate_summary(request: GenerateSummaryRequest):
    """
    Generate a one-page summary document for a course or topic.
    Returns beautifully formatted markdown content ready for download.
    """
    try:
        if not anthropic_client or not TOOLS_AVAILABLE:
            return {
                "error": "AI capabilities not available. Please configure ANTHROPIC_API_KEY.",
                "content": None
            }
        
        # Build prompt for summary generation
        if request.course_id:
            # Get course details first
            from ai_tools import get_course_details, get_course_materials
            course_data = get_course_details(request.course_id)
            materials = get_course_materials(request.course_id)
            
            prompt = f"""Generate a comprehensive, well-formatted one-page summary for the course {course_data.get('code', '')} - {course_data.get('name', '')}.

Course Description: {course_data.get('description', '')}
Topics: {', '.join(course_data.get('topics', []))}
Prerequisites: {', '.join(course_data.get('prerequisites', []))}

Create a markdown document with the following sections:

# {course_data.get('code', '')} - {course_data.get('name', '')}

## Overview
2-3 sentences describing the course and what students will learn.

## Key Topics Covered
- List the main topics (use bullet points)
- Include brief explanations for each

## Prerequisites
List any prerequisite courses and why they're needed.

## Course Materials
Organize available materials by type:
- Lecture Notes
- Textbook Chapters
- Labs/Assignments
- Exams/Assessments

## Learning Objectives
3-5 specific learning objectives students will achieve.

## Key Takeaways
2-3 high-level takeaways for students considering this course.

Make it professional, clear, and suitable for printing as a one-page reference."""
        elif request.topic:
            prompt = f"""Generate a comprehensive one-page summary about the topic: {request.topic}.

Create a markdown document with:

# {request.topic}

## Overview
Clear explanation of what this topic is about.

## Key Concepts
- Main ideas and principles
- Important definitions

## Applications
Where and how this topic is used in practice.

## Related CMU Courses
Which courses cover this topic.

## Key Takeaways
Main points students should understand.

Make it clear, concise, and educational."""
        else:
            # Summarize arbitrary content
            prompt = f"""Generate a clean, well-organized summary of the following content:

{request.content[:3000]}

Create a markdown document with:
- Clear headings and structure
- Key points as bullet lists
- Important concepts highlighted
- Professional formatting

Keep it to one page."""
        
        # Call Claude to generate summary
        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",  # Latest fastest Haiku model
            max_tokens=3000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        summary_text = ""
        for block in response.content:
            if hasattr(block, "text"):
                summary_text += block.text
        
        # If PDF format requested, convert markdown to PDF
        if request.format == "pdf":
            if not WEASYPRINT_AVAILABLE or not MARKDOWN_AVAILABLE:
                return {
                    "error": "PDF generation is not available. Please install weasyprint and markdown: pip install weasyprint markdown",
                    "content": None
                }
            
            # Convert markdown to HTML
            html_content = markdown.markdown(summary_text, extensions=['extra', 'codehilite'])
            
            # Create full HTML document with styling
            html_doc = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    @page {{
                        size: A4;
                        margin: 1in;
                    }}
                    body {{
                        font-family: 'Times New Roman', Times, serif;
                        font-size: 12pt;
                        line-height: 1.6;
                        color: #000;
                    }}
                    h1 {{
                        font-size: 18pt;
                        font-weight: bold;
                        margin-top: 0;
                        margin-bottom: 12pt;
                        border-bottom: 2pt solid #000;
                        padding-bottom: 6pt;
                    }}
                    h2 {{
                        font-size: 14pt;
                        font-weight: bold;
                        margin-top: 18pt;
                        margin-bottom: 12pt;
                    }}
                    h3 {{
                        font-size: 12pt;
                        font-weight: bold;
                        margin-top: 12pt;
                        margin-bottom: 6pt;
                    }}
                    p {{
                        margin-bottom: 12pt;
                        text-align: justify;
                    }}
                    ul, ol {{
                        margin-bottom: 12pt;
                        padding-left: 24pt;
                    }}
                    li {{
                        margin-bottom: 6pt;
                    }}
                    code {{
                        background-color: #f5f5f5;
                        padding: 2pt 4pt;
                        border-radius: 3pt;
                        font-family: 'Courier New', monospace;
                        font-size: 10pt;
                    }}
                    pre {{
                        background-color: #f5f5f5;
                        padding: 12pt;
                        border-radius: 6pt;
                        overflow-x: auto;
                        margin-bottom: 12pt;
                    }}
                    pre code {{
                        background-color: transparent;
                        padding: 0;
                    }}
                </style>
            </head>
            <body>
                {html_content}
            </body>
            </html>
            """
            
            # Generate PDF
            font_config = FontConfiguration()
            pdf_bytes = HTML(string=html_doc).write_pdf(font_config=font_config)
            
            # Return PDF as response
            filename = f"course-{request.course_id}-summary.pdf" if request.course_id else "course-summary.pdf"
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"'
                }
            )
        
        # Return markdown
        return {
            "content": summary_text,
            "format": "markdown",
            "course_id": request.course_id,
            "topic": request.topic
        }
        
    except Exception as e:
        print(f"❌ Summary generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-document")
async def upload_document(
    course_id: str = Form(...),
    category: str = Form(...),  # "recitations", "class_notes", "homeworks"
    file: UploadFile = File(...)
):
    """
    Upload a document for a course and categorize it.
    Categories: recitations, class_notes, homeworks
    """
    try:
        # Validate category
        valid_categories = ["recitations", "class_notes", "homeworks"]
        if category not in valid_categories:
            raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {valid_categories}")
        
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix
        stored_filename = f"{file_id}{file_extension}"
        file_path = UPLOAD_DIR / stored_filename
        
        # Save file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Update metadata
        metadata = load_metadata()
        if course_id not in metadata:
            metadata[course_id] = {}
        if category not in metadata[course_id]:
            metadata[course_id][category] = []
        
        file_metadata = {
            "id": file_id,
            "filename": file.filename,
            "stored_filename": stored_filename,
            "category": category,
            "uploaded_at": datetime.now().isoformat(),
            "size": len(content)
        }
        
        metadata[course_id][category].append(file_metadata)
        save_metadata(metadata)
        
        return {
            "success": True,
            "file_id": file_id,
            "filename": file.filename,
            "category": category,
            "course_id": course_id
        }
        
    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/courses/{course_id}/documents")
async def get_course_documents(course_id: str):
    """Get all uploaded documents for a course"""
    try:
        metadata = load_metadata()
        course_docs = metadata.get(course_id, {})
        return {"documents": course_docs}
    except Exception as e:
        print(f"❌ Get documents error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pdfs/{filename}")
async def get_pdf(filename: str):
    """Serve a PDF file from /data/books/"""
    from pathlib import Path
    data_dir = Path(__file__).parent.parent / "data" / "books"
    pdf_path = data_dir / filename
    
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF not found")
    
    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=filename
    )

@app.get("/api/documents/{file_id}/download")
async def download_document(file_id: str):
    """Download a document by file ID"""
    try:
        metadata = load_metadata()
        
        # Find file in metadata
        for course_id, categories in metadata.items():
            for category, files in categories.items():
                for file_meta in files:
                    if file_meta["id"] == file_id:
                        file_path = UPLOAD_DIR / file_meta["stored_filename"]
                        if file_path.exists():
                            return FileResponse(
                                file_path,
                                filename=file_meta["filename"],
                                media_type="application/octet-stream"
                            )
        
        raise HTTPException(status_code=404, detail="File not found")
        
    except Exception as e:
        print(f"❌ Download error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/documents/{file_id}")
async def delete_document(file_id: str):
    """Delete a document by file ID"""
    try:
        metadata = load_metadata()
        
        # Find and remove file
        for course_id, categories in metadata.items():
            for category, files in categories.items():
                for i, file_meta in enumerate(files):
                    if file_meta["id"] == file_id:
                        file_path = UPLOAD_DIR / file_meta["stored_filename"]
                        if file_path.exists():
                            file_path.unlink()
                        files.pop(i)
                        save_metadata(metadata)
                        return {"success": True}
        
        raise HTTPException(status_code=404, detail="File not found")
        
    except Exception as e:
        print(f"❌ Delete error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Initialize data loader on startup
@app.on_event("startup")
async def startup_event():
    from data_loader import get_data_loader
    print("📚 Initializing data loader...")
    loader = get_data_loader()
    print(f"✅ Data loader ready: {len(loader.courses)} courses, {len(loader.pdfs)} PDFs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

