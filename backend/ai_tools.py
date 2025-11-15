"""
CMU Course AI Tools - Function calling for Anthropic Claude
Allows the AI to fetch and parse course documents, materials, and topics
"""

from typing import Dict, List, Any, Optional

# Tool definitions for Anthropic API
COURSE_TOOLS = [
    {
        "name": "search_courses",
        "description": "Search for CMU CS courses by name, code, or topic. Use when user asks about finding courses.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query (course code like '15-213', topic like 'systems', or keyword)"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_course_details",
        "description": "Get complete details about a specific course including description, topics, prerequisites, and structure.",
        "input_schema": {
            "type": "object",
            "properties": {
                "course_id": {
                    "type": "string",
                    "description": "The course ID (e.g., '213' for 15-213)"
                }
            },
            "required": ["course_id"]
        }
    },
    {
        "name": "get_course_materials",
        "description": "Get all materials for a course organized by section (notes, recitations, textbook, labs, assignments, exams).",
        "input_schema": {
            "type": "object",
            "properties": {
                "course_id": {
                    "type": "string",
                    "description": "The course ID"
                },
                "section": {
                    "type": "string",
                    "description": "Filter by section type: 'notes', 'recitations', 'textbook', 'labs', 'assignments', 'exams'. Leave empty for all.",
                    "enum": ["notes", "recitations", "textbook", "labs", "assignments", "exams", ""]
                }
            },
            "required": ["course_id"]
        }
    },
    {
        "name": "search_course_content",
        "description": "Search within course materials for specific topics or keywords. Use when user asks about specific chapters or concepts.",
        "input_schema": {
            "type": "object",
            "properties": {
                "course_id": {
                    "type": "string",
                    "description": "The course ID to search in"
                },
                "query": {
                    "type": "string",
                    "description": "Search query (e.g., 'cache', 'malloc', 'pointers')"
                },
                "section": {
                    "type": "string",
                    "description": "Limit search to specific section",
                    "enum": ["notes", "recitations", "textbook", "labs", "assignments", "exams", ""]
                }
            },
            "required": ["course_id", "query"]
        }
    },
    {
        "name": "get_document_content",
        "description": "Get the full content of a specific course document/chapter. Use when user wants to read or learn about specific material.",
        "input_schema": {
            "type": "object",
            "properties": {
                "course_id": {
                    "type": "string",
                    "description": "The course ID"
                },
                "document_id": {
                    "type": "string",
                    "description": "The document ID (e.g., 'cache-notes', 'textbook-ch6')"
                }
            },
            "required": ["course_id", "document_id"]
        }
    },
    {
        "name": "get_related_courses",
        "description": "Find courses related to a given course based on topics, prerequisites, or similarity.",
        "input_schema": {
            "type": "object",
            "properties": {
                "course_id": {
                    "type": "string",
                    "description": "The course ID to find relations for"
                },
                "relation_type": {
                    "type": "string",
                    "description": "Type of relation: 'prerequisites', 'similar_topics', 'next_courses'",
                    "enum": ["prerequisites", "similar_topics", "next_courses", "all"]
                }
            },
            "required": ["course_id"]
        }
    },
    {
        "name": "parse_document_section",
        "description": "Parse and extract specific sections from a course document (e.g., key concepts, examples, practice problems).",
        "input_schema": {
            "type": "object",
            "properties": {
                "course_id": {
                    "type": "string",
                    "description": "The course ID"
                },
                "document_id": {
                    "type": "string",
                    "description": "The document ID"
                },
                "section_type": {
                    "type": "string",
                    "description": "Type of content to extract",
                    "enum": ["key_concepts", "examples", "practice_problems", "summary", "definitions"]
                }
            },
            "required": ["course_id", "document_id", "section_type"]
        }
    },
    {
        "name": "get_topic_overview",
        "description": "Get a comprehensive overview of a specific topic across all relevant courses.",
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": "The topic to get overview for (e.g., 'cache', 'memory', 'algorithms')"
                }
            },
            "required": ["topic"]
        }
    },
]


def execute_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a course tool and return results
    """
    if tool_name == "search_courses":
        return search_courses(tool_input.get("query", ""))
    
    elif tool_name == "get_course_details":
        return get_course_details(tool_input.get("course_id", ""))
    
    elif tool_name == "get_course_materials":
        return get_course_materials(
            tool_input.get("course_id", ""),
            tool_input.get("section")
        )
    
    elif tool_name == "search_course_content":
        return search_course_content(
            tool_input.get("course_id", ""),
            tool_input.get("query", ""),
            tool_input.get("section")
        )
    
    elif tool_name == "get_document_content":
        return get_document_content(
            tool_input.get("course_id", ""),
            tool_input.get("document_id", "")
        )
    
    elif tool_name == "get_related_courses":
        return get_related_courses(
            tool_input.get("course_id", ""),
            tool_input.get("relation_type", "all")
        )
    
    elif tool_name == "parse_document_section":
        return parse_document_section(
            tool_input.get("course_id", ""),
            tool_input.get("document_id", ""),
            tool_input.get("section_type", "summary")
        )
    
    elif tool_name == "get_topic_overview":
        return get_topic_overview(tool_input.get("topic", ""))
    
    else:
        return {"error": f"Unknown tool: {tool_name}"}


# Tool implementation functions
def search_courses(query: str) -> Dict[str, Any]:
    """Search for courses"""
    mock_courses = [
        {"id": "213", "code": "15-213", "name": "Introduction to Computer Systems", "topics": ["Cache", "Memory", "Assembly"]},
        {"id": "122", "code": "15-122", "name": "Principles of Imperative Computation", "topics": ["C0", "Data Structures"]},
        {"id": "251", "code": "15-251", "name": "Great Theoretical Ideas in Computer Science", "topics": ["Graph Theory", "Probability"]},
        {"id": "210", "code": "15-210", "name": "Principles of Programming", "topics": ["Parallel Algorithms", "Functional Programming"]},
        {"id": "150", "code": "15-150", "name": "Algorithms", "topics": ["Dynamic Programming", "Graph Algorithms"]},
        {"id": "451", "code": "15-451", "name": "Database Systems", "topics": ["SQL", "Query Optimization"]},
    ]
    
    query_lower = query.lower()
    results = [
        c for c in mock_courses
        if query_lower in c["code"].lower() 
        or query_lower in c["name"].lower()
        or any(query_lower in topic.lower() for topic in c["topics"])
    ]
    
    return {"courses": results, "count": len(results)}


def get_course_details(course_id: str) -> Dict[str, Any]:
    """Get course details"""
    courses = {
        "213": {
            "id": "213",
            "code": "15-213",
            "name": "Introduction to Computer Systems",
            "description": "This course provides a comprehensive introduction to computer systems from a programmer's perspective. Topics include data representation, assembly language, machine-level programming, processor architecture, caching, memory hierarchy, linking, and exceptional control flow.",
            "topics": ["Cache", "Memory", "Assembly", "C Programming", "Virtual Memory", "Linking"],
            "prerequisites": ["15-122"],
            "sections": ["notes", "recitations", "textbook", "labs", "exams"]
        },
        "122": {
            "id": "122",
            "code": "15-122",
            "name": "Principles of Imperative Computation",
            "description": "Introduction to imperative programming using C0, covering data structures, algorithms, and program correctness.",
            "topics": ["C0", "Data Structures", "Algorithms", "Contracts", "Testing"],
            "prerequisites": [],
            "sections": ["notes", "recitations", "textbook", "assignments", "exams"]
        },
    }
    
    return courses.get(course_id, {"error": "Course not found"})


def get_course_materials(course_id: str, section: Optional[str] = None) -> Dict[str, Any]:
    """Get course materials organized by section"""
    materials = {
        "213": {
            "notes": [
                {"id": "cache-notes", "label": "Cache Chapter", "content_preview": "Introduction to cache organization, hierarchy, and performance..."},
                {"id": "memory-notes", "label": "Memory Management", "content_preview": "Virtual memory, paging, and address translation..."},
                {"id": "assembly-notes", "label": "Assembly Language", "content_preview": "x86-64 assembly, registers, and instructions..."},
            ],
            "recitations": [
                {"id": "recitation-1", "label": "Pointers & Memory", "content_preview": "Practice with C pointers and memory allocation..."},
                {"id": "recitation-2", "label": "Cache Optimization", "content_preview": "Techniques for improving cache performance..."},
            ],
            "textbook": [
                {"id": "textbook-ch3", "label": "Ch 3: Machine-Level", "content_preview": "Chapter 3 covers machine-level representation of programs..."},
                {"id": "textbook-ch6", "label": "Ch 6: Memory Hierarchy", "content_preview": "Understanding the memory hierarchy from registers to disk..."},
            ],
            "labs": [
                {"id": "cache-lab", "label": "Cache Lab", "content_preview": "Implement a cache simulator and optimize for cache performance..."},
                {"id": "malloc-lab", "label": "Malloc Lab", "content_preview": "Write a dynamic memory allocator..."},
            ],
            "exams": [
                {"id": "midterm", "label": "Midterm", "content_preview": "Covers lectures 1-12..."},
                {"id": "final", "label": "Final", "content_preview": "Comprehensive exam..."},
            ],
        },
    }
    
    course_materials = materials.get(course_id, {})
    
    if section:
        return {section: course_materials.get(section, [])}
    
    return course_materials


def search_course_content(course_id: str, query: str, section: Optional[str] = None) -> Dict[str, Any]:
    """Search within course materials"""
    # Mock search results
    results = []
    
    if course_id == "213" and "cache" in query.lower():
        results = [
            {
                "document_id": "cache-notes",
                "title": "Cache Chapter",
                "section": "notes",
                "relevant_excerpt": "Cache organization involves understanding how data is stored in different levels of the memory hierarchy. The cache is a small, fast memory that stores recently accessed data.",
                "relevance_score": 0.95
            },
            {
                "document_id": "cache-lab",
                "title": "Cache Lab",
                "section": "labs",
                "relevant_excerpt": "In this lab, you will implement a cache simulator that models the behavior of a cache memory system.",
                "relevance_score": 0.90
            },
            {
                "document_id": "textbook-ch6",
                "title": "Ch 6: Memory Hierarchy",
                "section": "textbook",
                "relevant_excerpt": "The memory hierarchy consists of multiple levels of storage, with caches serving as intermediate layers between the processor and main memory.",
                "relevance_score": 0.85
            },
        ]
    
    return {"results": results, "count": len(results), "query": query}


def get_document_content(course_id: str, document_id: str) -> Dict[str, Any]:
    """Get full document content"""
    # Mock document content
    documents = {
        "213": {
            "cache-notes": {
                "id": "cache-notes",
                "title": "Cache Organization and Performance",
                "section": "notes",
                "content": """# Cache Organization and Performance

## Introduction
Caching is one of the most important concepts in computer systems. A cache is a small, fast memory that stores recently accessed data to improve performance.

## Key Concepts
- **Cache Hit**: Data is found in cache
- **Cache Miss**: Data must be fetched from main memory
- **Hit Rate**: Percentage of accesses that are hits
- **Miss Penalty**: Time cost of a miss

## Cache Organization
1. Direct-mapped cache
2. Set-associative cache
3. Fully-associative cache

## Performance Metrics
- Average memory access time (AMAT)
- Cache block size optimization
- Replacement policies (LRU, FIFO, Random)

## Practice Problems
1. Calculate hit rate given access pattern
2. Design cache for optimal performance
3. Analyze cache behavior with matrix operations""",
                "topics": ["Cache Organization", "Cache Performance", "Hit Rate", "Miss Penalty"],
                "related_materials": ["cache-lab", "textbook-ch6", "recitation-2"]
            },
            "textbook-ch6": {
                "id": "textbook-ch6",
                "title": "Chapter 6: The Memory Hierarchy",
                "section": "textbook",
                "content": """# Chapter 6: The Memory Hierarchy

## 6.1 Storage Technologies
Understanding different storage technologies and their characteristics.

## 6.2 Locality
- Temporal locality
- Spatial locality

## 6.3 The Memory Hierarchy
From registers to disk storage.

## 6.4 Cache Memories
Detailed coverage of cache organization, operation, and performance.

## 6.5 Writing Cache-Friendly Code
Techniques for optimizing programs for cache performance.

## 6.6 Case Study: Matrix Multiplication
Real-world example of cache optimization.""",
                "topics": ["Memory Hierarchy", "Cache", "Locality", "Optimization"],
                "related_materials": ["cache-notes", "cache-lab"]
            },
        },
    }
    
    course_docs = documents.get(course_id, {})
    document = course_docs.get(document_id, {"error": "Document not found"})
    
    return document


def get_related_courses(course_id: str, relation_type: str = "all") -> Dict[str, Any]:
    """Find related courses"""
    relations = {
        "213": {
            "prerequisites": ["122"],
            "similar_topics": ["451", "410"],
            "next_courses": ["451", "418", "440"],
        },
        "122": {
            "prerequisites": [],
            "similar_topics": ["150", "210"],
            "next_courses": ["213", "210", "150"],
        },
    }
    
    course_relations = relations.get(course_id, {})
    
    if relation_type == "all":
        return course_relations
    else:
        return {relation_type: course_relations.get(relation_type, [])}


def parse_document_section(course_id: str, document_id: str, section_type: str) -> Dict[str, Any]:
    """Parse specific sections from a document"""
    # Mock parsed sections
    if course_id == "213" and document_id == "cache-notes":
        sections = {
            "key_concepts": [
                "Cache hit and miss",
                "Hit rate and miss penalty",
                "Direct-mapped vs set-associative caches",
                "Replacement policies (LRU, FIFO)",
                "Write policies (write-through, write-back)"
            ],
            "examples": [
                "Calculating hit rate from access pattern",
                "Cache block size impact on performance",
                "Matrix multiplication cache optimization"
            ],
            "practice_problems": [
                "Given a direct-mapped cache with 16 blocks, determine hits/misses for access sequence",
                "Design a cache configuration for optimal performance",
                "Analyze cache behavior with different block sizes"
            ],
            "summary": "Caching improves performance by storing frequently accessed data closer to the CPU. Understanding cache organization, hit rates, and optimization techniques is crucial for writing efficient systems code.",
            "definitions": {
                "Cache": "Small, fast memory that stores recently accessed data",
                "Hit Rate": "Percentage of memory accesses found in cache",
                "Miss Penalty": "Time cost of fetching data from main memory",
                "Temporal Locality": "Recently accessed data likely to be accessed again",
                "Spatial Locality": "Data near recently accessed data likely to be accessed"
            }
        }
        
        return {"section_type": section_type, "content": sections.get(section_type, {})}
    
    return {"error": "Document or section not found"}


def get_topic_overview(topic: str) -> Dict[str, Any]:
    """Get overview of a topic across courses"""
    topic_lower = topic.lower()
    
    # Mock topic mappings
    topic_courses = {
        "cache": {
            "primary_course": "213",
            "description": "Caching is primarily covered in 15-213 (Computer Systems) with deep coverage of cache organization, performance, and optimization.",
            "related_courses": ["451", "418"],
            "key_materials": [
                {"course": "213", "material": "cache-notes", "section": "notes"},
                {"course": "213", "material": "cache-lab", "section": "labs"},
                {"course": "213", "material": "textbook-ch6", "section": "textbook"},
            ]
        },
        "memory": {
            "primary_course": "213",
            "description": "Memory management is core to 15-213, covering virtual memory, address translation, and memory allocation.",
            "related_courses": ["410", "418"],
            "key_materials": [
                {"course": "213", "material": "memory-notes", "section": "notes"},
                {"course": "213", "material": "malloc-lab", "section": "labs"},
            ]
        },
    }
    
    return topic_courses.get(topic_lower, {
        "message": f"Topic '{topic}' found across multiple courses. Use search_courses to find specific courses covering this topic."
    })

