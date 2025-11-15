"""
Data Loader for CMU Course Data
Loads course information from /data folder and indexes PDFs for search
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import json

# Try to import PDF parsing libraries
try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    try:
        import pdfplumber
        PDF_AVAILABLE = True
        USE_PDFPLUMBER = True
    except ImportError:
        PDF_AVAILABLE = False
        USE_PDFPLUMBER = False
        print("⚠️ PDF parsing libraries not available. Install with: pip install PyPDF2 or pdfplumber")

@dataclass
class Course:
    id: str
    code: str
    name: str
    url: Optional[str] = None
    description: Optional[str] = None
    topics: List[str] = None
    prerequisites: List[str] = None
    books: List[Dict[str, str]] = None
    pdfs: List[str] = None
    
    def __post_init__(self):
        if self.topics is None:
            self.topics = []
        if self.prerequisites is None:
            self.prerequisites = []
        if self.books is None:
            self.books = []
        if self.pdfs is None:
            self.pdfs = []

@dataclass
class PDFDocument:
    course_id: str
    filename: str
    filepath: str
    title: Optional[str] = None
    pages: int = 0
    text_content: Optional[str] = None
    chapters: Dict[str, str] = None  # chapter_title -> text
    
    def __post_init__(self):
        if self.chapters is None:
            self.chapters = {}

class DataLoader:
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            # Default to data folder in project root
            self.data_dir = Path(__file__).parent.parent / "data"
        else:
            self.data_dir = Path(data_dir)
        
        self.courses: Dict[str, Course] = {}
        self.pdfs: Dict[str, PDFDocument] = {}  # filename -> PDFDocument
        self.course_pdfs: Dict[str, List[str]] = {}  # course_id -> [filenames]
        
    def load_all(self):
        """Load fake course data and index PDFs"""
        print("📚 Loading course data...")
        self.load_fake_courses()
        self.index_pdfs()
        print(f"✅ Loaded {len(self.courses)} courses and {len(self.pdfs)} PDFs")
    
    def load_fake_courses(self):
        """Load fake course data for cleaner diagram"""
        fake_courses = [
            Course(
                id="213",
                code="15-213",
                name="Introduction to Computer Systems",
                description="Introduction to computer systems from a programmer's perspective. Topics include machine-level code, memory organization, caching, linking, and concurrency.",
                topics=["Cache", "Memory", "Assembly", "C Programming", "Linking", "Concurrency"],
                prerequisites=["15-122"],
                url="https://www.cs.cmu.edu/~213/",
                pdfs=[],
                books=[]
            ),
            Course(
                id="122",
                code="15-122",
                name="Principles of Imperative Computation",
                description="Introduction to imperative programming and data structures. Covers C0 language, arrays, linked lists, trees, and basic algorithms.",
                topics=["C0", "Data Structures", "Algorithms", "Pointers", "Memory Management"],
                prerequisites=[],
                url="https://www.cs.cmu.edu/~15122/",
                pdfs=[],
                books=[]
            ),
            Course(
                id="251",
                code="15-251",
                name="Great Theoretical Ideas in Computer Science",
                description="Introduction to theoretical computer science. Topics include graph theory, probability, complexity theory, and algorithms.",
                topics=["Graph Theory", "Probability", "Complexity", "Algorithms", "Combinatorics"],
                prerequisites=[],
                url="https://www.cs.cmu.edu/~15251/",
                pdfs=[],
                books=[]
            ),
            Course(
                id="210",
                code="15-210",
                name="Principles of Programming",
                description="Advanced programming concepts including parallel algorithms, functional programming, and data structures.",
                topics=["Parallel Algorithms", "Functional Programming", "Data Structures", "Concurrency"],
                prerequisites=["15-122"],
                url="https://www.cs.cmu.edu/~15210/",
                pdfs=[],
                books=[]
            ),
            Course(
                id="150",
                code="15-150",
                name="Algorithms",
                description="Design and analysis of algorithms. Topics include dynamic programming, graph algorithms, and algorithmic paradigms.",
                topics=["Dynamic Programming", "Graph Algorithms", "Greedy Algorithms", "Divide and Conquer"],
                prerequisites=["15-122"],
                url="https://www.cs.cmu.edu/~15150/",
                pdfs=[],
                books=[]
            ),
            Course(
                id="451",
                code="15-451",
                name="Database Systems",
                description="Introduction to database systems. Covers SQL, query optimization, transactions, and database design.",
                topics=["SQL", "Query Optimization", "Transactions", "Database Design", "Indexing"],
                prerequisites=["15-213"],
                url="https://www.cs.cmu.edu/~15451/",
                pdfs=[],
                books=[]
            ),
        ]
        
        for course in fake_courses:
            self.courses[course.id] = course
    
    
    def index_pdfs(self):
        """Index PDF files - list them even without parsing libraries"""
        books_dir = self.data_dir / "books"
        if not books_dir.exists():
            print(f"⚠️ Books directory not found: {books_dir}")
            return
        
        for pdf_file in books_dir.glob("*.pdf"):
            try:
                # Always create a basic PDF document entry, even without parsing
                if PDF_AVAILABLE:
                    pdf_doc = self._parse_pdf(pdf_file)
                    if pdf_doc:
                        self.pdfs[pdf_file.name] = pdf_doc
                    else:
                        # Create minimal entry if parsing fails
                        course_id = self._extract_course_id_from_filename(pdf_file.name) or "unknown"
                        self.pdfs[pdf_file.name] = PDFDocument(
                            course_id=course_id,
                            filename=pdf_file.name,
                            filepath=str(pdf_file),
                            title=pdf_file.stem,
                            pages=0,
                            text_content=None
                        )
                else:
                    # Create minimal entry without parsing
                    course_id = self._extract_course_id_from_filename(pdf_file.name) or "unknown"
                    self.pdfs[pdf_file.name] = PDFDocument(
                        course_id=course_id,
                        filename=pdf_file.name,
                        filepath=str(pdf_file),
                        title=pdf_file.stem,
                        pages=0,
                        text_content=None
                    )
                
                # Map to course - try multiple matching strategies
                course_id = self._extract_course_id_from_filename(pdf_file.name)
                matched = False
                
                # Strategy 1: Direct course ID match
                if course_id and course_id in self.courses:
                    if course_id not in self.course_pdfs:
                        self.course_pdfs[course_id] = []
                    if pdf_file.name not in self.course_pdfs[course_id]:
                        self.course_pdfs[course_id].append(pdf_file.name)
                    if pdf_file.name not in self.courses[course_id].pdfs:
                        self.courses[course_id].pdfs.append(pdf_file.name)
                    matched = True
                
                # Strategy 2: Match by course code in filename (e.g., "15-210" or "15210")
                if not matched:
                    for course in self.courses.values():
                        course_code_full = course.code  # "15-210"
                        course_code_short = course.code.split('-')[1]  # "210"
                        course_code_no_dash = course.code.replace('-', '')  # "15210"
                        
                        # Check if any course code variant appears in filename
                        if (course_code_full in pdf_file.name or 
                            course_code_short in pdf_file.name or 
                            course_code_no_dash in pdf_file.name):
                            if course.id not in self.course_pdfs:
                                self.course_pdfs[course.id] = []
                            if pdf_file.name not in self.course_pdfs[course.id]:
                                self.course_pdfs[course.id].append(pdf_file.name)
                            if pdf_file.name not in course.pdfs:
                                course.pdfs.append(pdf_file.name)
                            matched = True
                            break
                
                # Strategy 3: Match generic PDFs to likely courses
                if not matched:
                    filename_lower = pdf_file.name.lower()
                    # Recitation slides could be for any course, but prioritize 15-213 and 15-122
                    if "rec" in filename_lower or "lab" in filename_lower:
                        # Try to match to 15-213 first (common systems course)
                        if "213" not in self.course_pdfs:
                            self.course_pdfs["213"] = []
                        if pdf_file.name not in self.course_pdfs["213"]:
                            self.course_pdfs["213"].append(pdf_file.name)
                        matched = True
                    # C programming bootcamp likely for 15-122 or 15-213
                    elif "cprogramming" in filename_lower or "c0" in filename_lower:
                        for cid in ["122", "213"]:
                            if cid in self.courses:
                                if cid not in self.course_pdfs:
                                    self.course_pdfs[cid] = []
                                if pdf_file.name not in self.course_pdfs[cid]:
                                    self.course_pdfs[cid].append(pdf_file.name)
                        matched = True
            except Exception as e:
                print(f"⚠️ Error indexing PDF {pdf_file.name}: {e}")
        
        if not PDF_AVAILABLE:
            print("⚠️ PDF parsing not available. PDFs listed but not parsed for search.")
    
    def _extract_course_id_from_filename(self, filename: str) -> Optional[str]:
        """Extract course ID from PDF filename"""
        # Try patterns like "15-210_book.pdf", "15_210_book.pdf", "15210_book.pdf"
        # Also support short IDs like "210" for "15-210"
        patterns = [
            r'(\d{2})-(\d{3})',  # 15-210 -> 210 (use short ID)
            r'(\d{2})_(\d{3})',  # 15_210 -> 210
            r'(\d{5})',          # 15210 -> 210 (extract last 3 digits)
            r'(\d{2})(\d{3})',   # 15210 -> 210
            r'-(\d{3})',         # -210 -> 210
            r'_(\d{3})',         # _210 -> 210
        ]
        
        for pattern in patterns:
            match = re.search(pattern, filename)
            if match:
                if len(match.groups()) == 2:
                    # Use the last 3 digits as course ID (e.g., "210")
                    return match.group(2)
                elif len(match.groups()) == 1:
                    group = match.group(1)
                    # If it's 5 digits, extract last 3
                    if len(group) == 5:
                        return group[2:]
                    # Otherwise use as is
                    return group
        return None
    
    def _parse_pdf(self, filepath: Path) -> Optional[PDFDocument]:
        """Parse a PDF file and extract text"""
        try:
            if USE_PDFPLUMBER:
                return self._parse_pdf_with_pdfplumber(filepath)
            else:
                return self._parse_pdf_with_pypdf2(filepath)
        except Exception as e:
            print(f"⚠️ Error parsing PDF {filepath.name}: {e}")
            return None
    
    def _parse_pdf_with_pypdf2(self, filepath: Path) -> Optional[PDFDocument]:
        """Parse PDF using PyPDF2"""
        import PyPDF2
        
        course_id = self._extract_course_id_from_filename(filepath.name) or "unknown"
        
        with open(filepath, 'rb') as f:
            pdf_reader = PyPDF2.PdfReader(f)
            pages = len(pdf_reader.pages)
            
            text_content = ""
            for page in pdf_reader.pages:
                text_content += page.extract_text() + "\n"
        
        return PDFDocument(
            course_id=course_id,
            filename=filepath.name,
            filepath=str(filepath),
            pages=pages,
            text_content=text_content
        )
    
    def _parse_pdf_with_pdfplumber(self, filepath: Path) -> Optional[PDFDocument]:
        """Parse PDF using pdfplumber"""
        import pdfplumber
        
        course_id = self._extract_course_id_from_filename(filepath.name) or "unknown"
        
        text_content = ""
        pages = 0
        
        with pdfplumber.open(filepath) as pdf:
            pages = len(pdf.pages)
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    text_content += text + "\n"
        
        return PDFDocument(
            course_id=course_id,
            filename=filepath.name,
            filepath=str(filepath),
            pages=pages,
            text_content=text_content
        )
    
    def get_course(self, course_id: str) -> Optional[Course]:
        """Get a course by ID"""
        return self.courses.get(course_id)
    
    def search_courses(self, query: str) -> List[Course]:
        """Fuzzy search courses - returns all courses if query is empty"""
        if not query or query.strip() == "":
            # Return all courses if no query
            return list(self.courses.values())
        
        query_lower = query.lower().strip()
        results = []
        
        for course in self.courses.values():
            score = 0
            if query_lower in course.code.lower():
                score += 10
            if query_lower in course.name.lower():
                score += 8
            if course.description and query_lower in course.description.lower():
                score += 5
            for topic in course.topics:
                if query_lower in topic.lower():
                    score += 3
            
            if score > 0:
                results.append((score, course))
        
        # Sort by score
        results.sort(key=lambda x: x[0], reverse=True)
        return [course for _, course in results]
    
    def get_pdf(self, filename: str) -> Optional[PDFDocument]:
        """Get a PDF document by filename"""
        return self.pdfs.get(filename)
    
    def search_pdf_content(self, query: str, course_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search PDF content with fuzzy matching"""
        query_lower = query.lower()
        results = []
        
        pdfs_to_search = []
        if course_id:
            # Search PDFs for specific course
            pdf_filenames = self.course_pdfs.get(course_id, [])
            pdfs_to_search = [self.pdfs[f] for f in pdf_filenames if f in self.pdfs]
        else:
            # Search all PDFs
            pdfs_to_search = list(self.pdfs.values())
        
        for pdf in pdfs_to_search:
            if not pdf.text_content:
                continue
            
            # Simple text search with context
            text_lower = pdf.text_content.lower()
            if query_lower in text_lower:
                # Find all occurrences
                occurrences = []
                start = 0
                while True:
                    idx = text_lower.find(query_lower, start)
                    if idx == -1:
                        break
                    
                    # Extract context (200 chars before and after)
                    context_start = max(0, idx - 200)
                    context_end = min(len(pdf.text_content), idx + len(query) + 200)
                    context = pdf.text_content[context_start:context_end]
                    
                    occurrences.append({
                        "position": idx,
                        "context": context
                    })
                    start = idx + 1
                
                if occurrences:
                    results.append({
                        "pdf": pdf.filename,
                        "course_id": pdf.course_id,
                        "matches": len(occurrences),
                        "excerpts": occurrences[:5]  # Top 5 matches
                    })
        
        return results
    
    def get_pdf_chapter(self, filename: str, chapter_query: str) -> Optional[str]:
        """Extract a chapter from PDF based on query (e.g., 'chapter 3')"""
        pdf = self.pdfs.get(filename)
        if not pdf or not pdf.text_content:
            return None
        
        # Try to find chapter markers
        chapter_num_match = re.search(r'chapter\s+(\d+)', chapter_query.lower())
        if chapter_num_match:
            chapter_num = chapter_num_match.group(1)
            # Look for chapter headings
            pattern = rf'(?i)chapter\s+{chapter_num}[^\n]*\n'
            match = re.search(pattern, pdf.text_content)
            if match:
                start = match.start()
                # Find next chapter or end
                next_chapter = re.search(rf'(?i)chapter\s+{int(chapter_num)+1}', pdf.text_content[start:])
                if next_chapter:
                    end = start + next_chapter.start()
                else:
                    end = len(pdf.text_content)
                return pdf.text_content[start:end]
        
        return None

# Global data loader instance
_data_loader: Optional[DataLoader] = None

def get_data_loader() -> DataLoader:
    """Get or create the global data loader"""
    global _data_loader
    if _data_loader is None:
        _data_loader = DataLoader()
        _data_loader.load_all()
    return _data_loader

