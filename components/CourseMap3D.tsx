'use client'

import { useMemo, useRef, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { getCourseDocuments, searchCourses } from '@/lib/api'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d').then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-white">
      <div className="text-gray-500">Loading graph...</div>
    </div>
  ),
})

interface CourseNode {
  id: string
  name: string
  code: string
  color?: string
  topics?: string[]
}

interface CourseMap3DProps {
  selectedCourse: string | null
  onCourseSelect: (courseId: string | null) => void
}

// Mock course data
const mockCourses: CourseNode[] = [
  {
    id: '213',
    name: 'Introduction to Computer Systems',
    code: '15-213',
    color: '#6366F1',
    topics: ['Cache', 'Memory', 'Assembly', 'C Programming']
  },
  {
    id: '122',
    name: 'Principles of Imperative Computation',
    code: '15-122',
    color: '#06B6D4',
    topics: ['C0', 'Data Structures', 'Algorithms']
  },
  {
    id: '251',
    name: 'Great Theoretical Ideas in Computer Science',
    code: '15-251',
    color: '#10B981',
    topics: ['Graph Theory', 'Probability', 'Complexity']
  },
  {
    id: '210',
    name: 'Principles of Programming',
    code: '15-210',
    color: '#F59E0B',
    topics: ['Parallel Algorithms', 'Functional Programming']
  },
  {
    id: '150',
    name: 'Algorithms',
    code: '15-150',
    color: '#EF4444',
    topics: ['Dynamic Programming', 'Graph Algorithms']
  },
  {
    id: '451',
    name: 'Database Systems',
    code: '15-451',
    color: '#EC4899',
    topics: ['SQL', 'Query Optimization', 'Transactions']
  },
]

const mockLinks = [
  { source: '122', target: '213' },
  { source: '251', target: '213' },
  { source: '122', target: '210' },
  { source: '122', target: '150' },
  { source: '213', target: '451' },
]

// Material types organized by clear sections
const courseMaterials = {
  '213': {
    notes: [
      { id: 'cache-notes', label: 'Cache Chapter' },
      { id: 'memory-notes', label: 'Memory Management' },
      { id: 'assembly-notes', label: 'Assembly Language' },
    ],
    recitations: [
      { id: 'recitation-1', label: 'Pointers & Memory' },
      { id: 'recitation-2', label: 'Cache Optimization' },
    ],
    textbook: [
      { id: 'textbook-ch3', label: 'Ch 3: Machine-Level' },
      { id: 'textbook-ch6', label: 'Ch 6: Memory Hierarchy' },
    ],
    labs: [
      { id: 'cache-lab', label: 'Cache Lab' },
      { id: 'malloc-lab', label: 'Malloc Lab' },
    ],
    exams: [
      { id: 'midterm', label: 'Midterm' },
      { id: 'final', label: 'Final' },
    ],
  },
  '122': {
    notes: [
      { id: 'c0-notes', label: 'C0 Language' },
      { id: 'data-structures-notes', label: 'Data Structures' },
    ],
    recitations: [
      { id: 'recitation-1', label: 'Linked Lists' },
    ],
    textbook: [
      { id: 'textbook-ch1', label: 'Ch 1: Introduction' },
    ],
    assignments: [
      { id: 'hw1', label: 'HW1: Linked Lists' },
    ],
    exams: [
      { id: 'exam1', label: 'Exam 1' },
    ],
  },
  '251': {
    notes: [
      { id: 'graph-notes', label: 'Graph Theory' },
      { id: 'probability-notes', label: 'Probability' },
    ],
    textbook: [
      { id: 'textbook-ch5', label: 'Ch 5: Graph Algorithms' },
    ],
    assignments: [
      { id: 'hw2', label: 'HW2: Probability' },
    ],
  },
  '210': {
    notes: [
      { id: 'parallel-notes', label: 'Parallel Programming' },
    ],
    labs: [
      { id: 'lab1', label: 'Fork-Join Lab' },
    ],
  },
  '150': {
    notes: [
      { id: 'dp-notes', label: 'Dynamic Programming' },
    ],
  },
  '451': {
    notes: [
      { id: 'sql-notes', label: 'SQL Basics' },
    ],
    textbook: [
      { id: 'textbook-ch12', label: 'Ch 12: Query Processing' },
    ],
  },
}

// Section colors
const sectionColors = {
  notes: '#6366F1',
  recitations: '#10B981',
  textbook: '#F59E0B',
  labs: '#06B6D4',
  assignments: '#EC4899',
  exams: '#EF4444',
}

interface UploadedDocument {
  id: string
  filename: string
  category: string
  uploaded_at: string
  size: number
}

export default function CourseMap3D({ selectedCourse, onCourseSelect }: CourseMap3DProps) {
  const fgRef = useRef<any>(null)
  const [isStable, setIsStable] = useState(false)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [alphaDecay, setAlphaDecay] = useState(0.02)
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, {
    recitations?: UploadedDocument[]
    class_notes?: UploadedDocument[]
    homeworks?: UploadedDocument[]
  }>>({})
  const [coursesFromAPI, setCoursesFromAPI] = useState<CourseNode[]>([])

  // Load courses from API
  useEffect(() => {
    const loadCourses = async () => {
      try {
        // Load all courses by searching with empty query or a broad query
        const response = await searchCourses('')
        if (response.courses && response.courses.length > 0) {
          const loadedCourses: CourseNode[] = response.courses.map((c: any) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            color: getColorForCourse(c.code),
            topics: c.topics || []
          }))
          setCoursesFromAPI(loadedCourses)
        } else {
          // Fallback to mock data if API fails
          setCoursesFromAPI(mockCourses)
        }
      } catch (error) {
        console.error('Error loading courses:', error)
        // Fallback to mock data
        setCoursesFromAPI(mockCourses)
      }
    }
    loadCourses()
  }, [])

  // Helper function to assign colors to courses
  const getColorForCourse = (code: string): string => {
    const colors = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#F97316']
    const hash = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  // Load uploaded documents for all courses
  useEffect(() => {
    const loadAllDocuments = async () => {
      const coursesToLoad = coursesFromAPI.length > 0 ? coursesFromAPI : mockCourses
      const docs: Record<string, any> = {}
      for (const course of coursesToLoad) {
        try {
          const response = await getCourseDocuments(course.id)
          docs[course.id] = response.documents || {}
        } catch (error) {
          console.error(`Error loading documents for course ${course.id}:`, error)
          docs[course.id] = {}
        }
      }
      setUploadedDocuments(docs)
    }
    if (coursesFromAPI.length > 0 || mockCourses.length > 0) {
      loadAllDocuments()
    }
  }, [coursesFromAPI])

  // Configure force simulation for better spacing and stability
  useEffect(() => {
    if (fgRef.current) {
      // Dramatically increase repulsion between nodes for maximum spacing
      fgRef.current.d3Force('charge').strength(-30000)
      // Set very large link distance for wide spacing
      fgRef.current.d3Force('link').distance(2000)
      // Minimal center force to allow nodes to spread far apart
      fgRef.current.d3Force('center').strength(0.005)
      
      // After initial layout, reduce physics for stability but keep wide spacing
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.d3Force('charge').strength(-20000)
          fgRef.current.d3Force('link').distance(1800)
          setIsStable(true)
        }
      }, 2000)
    }
  }, [])

  // Stop physics simulation to keep graph stable
  useEffect(() => {
    if (fgRef.current && isStable) {
      // After initial layout, stop the simulation entirely
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.pauseAnimation()
        }
      }, 500)
    }
  }, [isStable])

  const graphData = useMemo(() => {
    const nodes: any[] = []
    const links: any[] = []
    const coursesToUse = coursesFromAPI.length > 0 ? coursesFromAPI : mockCourses

    // Add course nodes
    coursesToUse.forEach(course => {
      nodes.push({
        id: course.id,
        name: course.code,
        fullName: course.name,
        val: 20,
        color: course.color,
        type: 'course',
      })
    })

    // Add topic nodes for all courses
    coursesToUse.forEach(course => {
      if (course.topics) {
        course.topics.forEach(topic => {
          const topicId = `${course.id}-topic-${topic}`
          nodes.push({
            id: topicId,
            name: topic,
            val: 8,
            color: course.color,
            type: 'topic',
            courseId: course.id,
          })
          links.push({
            source: course.id,
            target: topicId,
            color: course.color,
            width: 1.5,
          })
        })
      }
    })

    // Add uploaded document nodes
    coursesToUse.forEach(course => {
      const courseDocs = uploadedDocuments[course.id] || {}
      const docCategories = [
        { key: 'recitations', color: '#10B981' },
        { key: 'class_notes', color: '#6366F1' },
        { key: 'homeworks', color: '#EC4899' }
      ]
      
      docCategories.forEach(({ key, color }) => {
        const docs = courseDocs[key as keyof typeof courseDocs] || []
        docs.forEach((doc: UploadedDocument) => {
          const docId = `doc-${doc.id}`
          nodes.push({
            id: docId,
            name: doc.filename.length > 20 ? doc.filename.substring(0, 20) + '...' : doc.filename,
            val: 6,
            color: color,
            type: 'document',
            courseId: course.id,
            documentId: doc.id,
            fullFilename: doc.filename,
            category: key,
          })
          links.push({
            source: course.id,
            target: docId,
            color: color,
            width: 1,
            opacity: 0.6,
          })
        })
      })
    })

    // Add prerequisite links between courses
    mockLinks.forEach(link => {
      links.push({
        source: link.source,
        target: link.target,
        color: '#9CA3AF',
        width: 2,
        curvature: 0.2,
      })
    })

    return { nodes, links }
  }, [uploadedDocuments, coursesFromAPI]) // Include coursesFromAPI to update graph when courses load

  const selectedCourseData = useMemo(() => {
    const coursesToUse = coursesFromAPI.length > 0 ? coursesFromAPI : mockCourses
    return coursesToUse.find(c => c.id === selectedCourse)
  }, [selectedCourse, coursesFromAPI])

  const handleNodeClick = useCallback((node: any) => {
    // Make all nodes clickable - clicking a node selects its course
    if (node.type === 'course') {
      onCourseSelect(selectedCourse === node.id ? null : node.id)
    } else if (node.courseId) {
      // Clicking topic/section/material selects the parent course
      onCourseSelect(selectedCourse === node.courseId ? null : node.courseId)
    }
  }, [selectedCourse, onCourseSelect])

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name
    const fontSize = node.type === 'course' ? 14 : (node.type === 'document' ? 8 : 10)
    const isSelected = selectedCourse === node.id || (node.courseId && selectedCourse === node.courseId)
    const isHovered = hoveredNodeId === node.id
    const nodeRadius = node.val + (isHovered ? 2 : 0)

    // Draw circle - always visible with clear fill and stroke
    ctx.beginPath()
    ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false)
    
    // Fill circle - white for courses, light gray for topics
    if (node.type === 'course') {
      ctx.fillStyle = '#FFFFFF'
    } else {
      ctx.fillStyle = '#F9FAFB'
    }
    ctx.fill()
    
    // Draw stroke - thicker for selected/hovered
    ctx.strokeStyle = node.color
    const strokeWidth = isSelected ? 4 / globalScale : (isHovered ? 3 / globalScale : 2.5 / globalScale)
    ctx.lineWidth = strokeWidth
    ctx.stroke()

    // Draw label text
    ctx.font = `bold ${fontSize / globalScale}px Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = node.type === 'course' ? node.color : '#1F2937'
    ctx.fillText(label, node.x, node.y)
    
    // Add subtle glow for hovered nodes
    if (isHovered) {
      ctx.save()
      ctx.globalAlpha = 0.2
      ctx.beginPath()
      ctx.arc(node.x, node.y, nodeRadius + 4, 0, 2 * Math.PI, false)
      ctx.fillStyle = node.color
      ctx.fill()
      ctx.restore()
    }
  }, [selectedCourse, hoveredNodeId])

  const paintLink = useCallback((link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const start = link.source
    const end = link.target
    
    if (typeof start !== 'object' || typeof end !== 'object') return

    ctx.strokeStyle = link.color || '#9CA3AF'
    ctx.lineWidth = (link.width || 1) / globalScale
    ctx.globalAlpha = 0.8 // More opaque edges

    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
    
    ctx.globalAlpha = 1
  }, [])

  return (
    <div className="w-full h-full relative bg-white" style={{ cursor: 'default' }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={(node: any) => `${node.name}${node.fullName ? ': ' + node.fullName : ''}`}
        nodeColor={(node: any) => node.color}
        linkColor={(link: any) => link.color}
        linkWidth={(link: any) => link.width || 1}
        nodeCanvasObject={paintNode}
        linkCanvasObject={paintLink}
        onNodeClick={handleNodeClick}
        nodeRelSize={1}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkCurvature={(link: any) => link.curvature || 0}
        d3VelocityDecay={0.5}
        d3AlphaDecay={alphaDecay}
        backgroundColor="#FFFFFF"
        enableNodeDrag={false}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        minZoom={0.2}
        maxZoom={8}
        cooldownTicks={150}
        warmupTicks={100}
        onNodeHover={(node: any) => {
          if (node) {
            setHoveredNodeId(node.id)
            document.body.style.cursor = 'pointer'
          } else {
            setHoveredNodeId(null)
            document.body.style.cursor = 'default'
          }
        }}
      />

      {/* Course panel is now handled by parent component */}

          {/* Hint - only show when no course is selected */}
          {!selectedCourse && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute top-6 left-6 z-10"
            >
              <div className="bg-white border border-neutral-200 px-4 py-2">
                <p className="text-xs font-light text-neutral-600">Click any course to view materials</p>
              </div>
            </motion.div>
          )}
    </div>
  )
}
