from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

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

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: Optional[str] = None
    course_id: Optional[str] = None
    tool_calls: Optional[int] = 0

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
            # Fallback to simple pattern matching
            message_lower = request.message.lower()
            course_id = None
            if "213" in message_lower or "15-213" in message_lower:
                course_id = "213"
            elif "122" in message_lower or "15-122" in message_lower:
                course_id = "122"
            
            response_text = "I can help you explore CMU CS courses! For full AI capabilities, configure ANTHROPIC_API_KEY."
            
            return ChatResponse(
                response=response_text,
                session_id=request.session_id or "default_session",
                course_id=course_id
            )
        
        # Build system prompt similar to Haven
        system_prompt = """You are a CMU CS Course Assistant with access to course materials, documents, and topics.

YOU MUST CALL TOOLS FOR EVERY REQUEST about courses, materials, or documents. NEVER answer from memory.

**Your capabilities:**
- Search courses by name, code, or topic
- Get detailed course information
- Access and parse course materials (notes, recitations, textbook chapters, labs, assignments, exams)
- Search within course content for specific topics
- Find related courses and prerequisites
- Extract key concepts, examples, and practice problems from documents

**Available Tools:**
You have access to database tools to fetch course information and parse documents:

**Query Tools:**
- search_courses: Find courses by name/code/topic
- get_course_details: Get complete course information
- get_course_materials: List all materials for a course
- search_course_content: Search within course materials
- get_document_content: Read full document content
- parse_document_section: Extract specific sections (key concepts, examples, etc.)
- get_topic_overview: Get topic coverage across courses
- get_related_courses: Find prerequisites and related courses

**Important Rules:**
1. ALWAYS use tools to fetch current course data
2. When asked about a specific chapter or topic (e.g., "cache chapter"), use search_course_content AND get_document_content
3. When showing course details, include the course_id in your response metadata so the UI can navigate to it
4. Parse documents to extract relevant sections when asked about specific concepts
5. For questions about course materials, list what's available by section (notes, labs, etc.)

USE TOOLS FIRST, then provide a helpful response based on the data."""

        # Call Anthropic API with tools
        print(f"📨 Chat request: {request.message[:100]}...")
        
        messages = [
            {"role": "user", "content": request.message}
        ]
        
        all_tool_results = []
        course_id_to_navigate = None
        max_iterations = 5
        iteration = 0
        
        # Tool calling loop (similar to Haven)
        while iteration < max_iterations:
            iteration += 1
            
            response = anthropic_client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=4096,
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
                
                # Execute all tools and collect results
                tool_results = []
                for tool_use in tool_uses:
                    tool_name = tool_use.name
                    tool_input = tool_use.input
                    print(f"      → {tool_name}({tool_input})")
                    
                    result = execute_tool(tool_name, tool_input)
                    all_tool_results.append({"tool": tool_name, "result": result})
                    
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
                
                return ChatResponse(
                    response=final_text,
                    session_id=request.session_id or "default_session",
                    course_id=course_id_to_navigate,
                    tool_calls=len(all_tool_results)
                )
        
        # If we hit max iterations, return what we have
        return ChatResponse(
            response="I've processed your request using multiple tools. Please ask a more specific question if you need additional information.",
            session_id=request.session_id or "default_session",
            course_id=course_id_to_navigate
        )
        
    except Exception as e:
        print(f"❌ Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/courses/search")
async def search_courses(q: str):
    """Search for courses by name or code"""
    # Mock data for now
    mock_courses = [
        {"id": "213", "code": "15-213", "name": "Introduction to Computer Systems"},
        {"id": "122", "code": "15-122", "name": "Principles of Imperative Computation"},
        {"id": "251", "code": "15-251", "name": "Great Theoretical Ideas in Computer Science"},
        {"id": "210", "code": "15-210", "name": "Principles of Programming"},
    ]
    
    query_lower = q.lower()
    filtered = [
        course for course in mock_courses
        if query_lower in course["code"].lower() or query_lower in course["name"].lower()
    ]
    
    return {"courses": filtered}

@app.get("/api/courses/{course_id}")
async def get_course(course_id: str):
    """Get details about a specific course"""
    # Mock data
    courses = {
        "213": {
            "id": "213",
            "code": "15-213",
            "name": "Introduction to Computer Systems",
            "description": "Introduction to computer systems from a programmer's perspective.",
            "topics": ["Cache", "Memory", "Assembly", "C Programming", "Virtual Memory"],
            "prerequisites": ["15-122"]
        },
        "122": {
            "id": "122",
            "code": "15-122",
            "name": "Principles of Imperative Computation",
            "description": "Fundamental concepts of imperative programming.",
            "topics": ["C0", "Data Structures", "Algorithms"],
            "prerequisites": []
        },
        "251": {
            "id": "251",
            "code": "15-251",
            "name": "Great Theoretical Ideas in Computer Science",
            "description": "Theoretical foundations of computer science.",
            "topics": ["Graph Theory", "Probability", "Complexity"],
            "prerequisites": []
        },
        "210": {
            "id": "210",
            "code": "15-210",
            "name": "Principles of Programming",
            "description": "Parallel and functional programming concepts.",
            "topics": ["Parallel Algorithms", "Functional Programming"],
            "prerequisites": ["15-122"]
        }
    }
    
    if course_id not in courses:
        raise HTTPException(status_code=404, detail="Course not found")
    
    return courses[course_id]

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

@app.post("/api/generate-summary")
async def generate_summary(request: GenerateSummaryRequest):
    """
    Generate a one-page summary document for a course or topic.
    Returns markdown content that can be downloaded.
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
            
            prompt = f"""Generate a comprehensive one-page summary for the course {course_data.get('code', '')} - {course_data.get('name', '')}.

Include:
1. Course Overview (2-3 sentences)
2. Key Topics Covered (bullet points)
3. Prerequisites
4. Main Learning Objectives
5. Important Materials Available (notes, labs, assignments)
6. Key Takeaways

Format as clean markdown suitable for printing."""
        elif request.topic:
            prompt = f"""Generate a comprehensive one-page summary about the topic: {request.topic}.

Include:
1. Topic Overview
2. Key Concepts
3. Applications
4. Related Courses (if applicable)
5. Key Takeaways

Format as clean markdown suitable for printing."""
        else:
            prompt = f"""Generate a one-page summary based on the following content:

{request.content[:2000]}

Format as clean markdown suitable for printing."""
        
        # Call Claude to generate summary
        response = anthropic_client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        summary_text = ""
        for block in response.content:
            if hasattr(block, "text"):
                summary_text += block.text
        
        return {
            "content": summary_text,
            "format": "markdown",
            "course_id": request.course_id,
            "topic": request.topic
        }
        
    except Exception as e:
        print(f"❌ Summary generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

