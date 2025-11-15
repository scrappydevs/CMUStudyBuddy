'use client'

import { useMemo, useRef, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

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

export default function CourseMap3D({ selectedCourse, onCourseSelect }: CourseMap3DProps) {
  const fgRef = useRef<any>(null)
  const [isStable, setIsStable] = useState(false)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [alphaDecay, setAlphaDecay] = useState(0.02)

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

  // Freeze physics when course is selected to prevent reorientation
  useEffect(() => {
    if (fgRef.current && selectedCourse) {
      // Significantly reduce physics when a course is selected but keep spacing
      fgRef.current.d3Force('charge').strength(-5000)
      fgRef.current.d3Force('link').distance(1500)
      setAlphaDecay(0.1) // Slow down simulation
    } else if (fgRef.current && isStable) {
      // Restore normal physics when deselected
      fgRef.current.d3Force('charge').strength(-20000)
      fgRef.current.d3Force('link').distance(1800)
      setAlphaDecay(0.02)
    }
  }, [selectedCourse, isStable])

  const graphData = useMemo(() => {
    const nodes: any[] = []
    const links: any[] = []

    // Add course nodes
    mockCourses.forEach(course => {
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
    mockCourses.forEach(course => {
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

    // Add section and material nodes for selected course
    if (selectedCourse && courseMaterials[selectedCourse as keyof typeof courseMaterials]) {
      const materials = courseMaterials[selectedCourse as keyof typeof courseMaterials]
      
      Object.entries(materials).forEach(([section, items]) => {
        const sectionId = `${selectedCourse}-section-${section}`
        const sectionColor = sectionColors[section as keyof typeof sectionColors]

        // Add section node
        nodes.push({
          id: sectionId,
          name: section.charAt(0).toUpperCase() + section.slice(1),
          val: 15,
          color: sectionColor,
          type: 'section',
          courseId: selectedCourse,
        })

        // Link course to section
        links.push({
          source: selectedCourse,
          target: sectionId,
          color: sectionColor,
          width: 3,
        })

        // Add material nodes
        if (Array.isArray(items)) {
          items.forEach((material) => {
            const materialId = `${selectedCourse}-${section}-${material.id}`
            nodes.push({
              id: materialId,
              name: material.label,
              val: 6,
              color: sectionColor,
              type: 'material',
              section: section,
              courseId: selectedCourse,
            })

            // Link section to material
            links.push({
              source: sectionId,
              target: materialId,
              color: sectionColor,
              width: 2,
            })
          })
        }
      })
    }

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
  }, [selectedCourse])

  const selectedCourseData = useMemo(() => {
    return mockCourses.find(c => c.id === selectedCourse)
  }, [selectedCourse])

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
    const fontSize = node.type === 'course' ? 14 : node.type === 'section' ? 12 : 10
    const isSelected = selectedCourse === node.id || (node.courseId && selectedCourse === node.courseId)
    const isHovered = hoveredNodeId === node.id
    const nodeRadius = node.val + (isHovered ? 3 : 0) // Slightly larger on hover

    // Draw circle with enhanced visibility and smooth transitions
    ctx.beginPath()
    ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false)
    
    // Fill with more opaque colors
    if (isSelected) {
      ctx.fillStyle = node.color + 'CC' // 80% opacity for selected
    } else if (isHovered) {
      ctx.fillStyle = node.color + 'AA' // 67% opacity for hovered
    } else if (node.type === 'section') {
      ctx.fillStyle = node.color + '99' // 60% opacity for sections
    } else if (node.type === 'course') {
      ctx.fillStyle = '#FFFFFF'
    } else {
      ctx.fillStyle = '#F9FAFB' // Light gray for other nodes
    }
    ctx.fill()
    
    // Stroke with better visibility and hover effects
    ctx.strokeStyle = isSelected ? node.color : (isHovered ? node.color : node.color)
    const strokeWidth = isSelected ? 3.5 / globalScale : (isHovered ? 3 / globalScale : (node.type === 'course' ? 2.5 / globalScale : 2 / globalScale))
    ctx.lineWidth = strokeWidth
    ctx.stroke()

    // Draw label with better contrast
    ctx.font = `${fontSize / globalScale}px Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Use white text for section nodes, colored for courses, dark for others
    if (node.type === 'section') {
      ctx.fillStyle = '#FFFFFF'
      ctx.font = `bold ${fontSize / globalScale}px Inter, system-ui, sans-serif`
    } else if (node.type === 'course') {
      ctx.fillStyle = node.color
      ctx.font = `bold ${fontSize / globalScale}px Inter, system-ui, sans-serif`
    } else {
      ctx.fillStyle = '#1F2937'
    }
    ctx.fillText(label, node.x, node.y)
    
    // Add cursor pointer effect hint
    if (isHovered) {
      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.arc(node.x, node.y, nodeRadius + 2, 0, 2 * Math.PI, false)
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
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        minZoom={0.2}
        maxZoom={8}
        cooldownTicks={selectedCourse ? 300 : 150}
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
        onNodeDragEnd={(node: any) => {
          // Fix node position after dragging to prevent drift
          if (node && fgRef.current) {
            node.fx = node.x
            node.fy = node.y
          }
        }}
      />

      {/* Info panel */}
      <AnimatePresence>
        {selectedCourse && selectedCourseData && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-6 left-6 z-10 max-w-sm"
          >
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-lg">
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 
                      className="text-xl font-semibold mb-1 text-gray-900"
                      style={{ color: selectedCourseData.color }}
                    >
                      {selectedCourseData.code}
                    </h3>
                    <p className="text-sm text-gray-600 font-normal leading-relaxed">
                      {selectedCourseData.name}
                    </p>
                  </div>
                  <button
                    onClick={() => onCourseSelect(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {selectedCourseData.topics && selectedCourseData.topics.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Topics
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedCourseData.topics.map(topic => (
                        <motion.span
                          key={topic}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 }}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-gray-50 text-gray-700 border border-gray-200"
                        >
                          {topic}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section legend */}
      <div className="absolute bottom-6 right-6 z-10">
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
          <p className="text-xs font-semibold text-gray-700 mb-2">Sections</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {Object.entries(sectionColors).map(([section, color]) => (
              <div key={section} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full border" 
                  style={{ backgroundColor: color + '40', borderColor: color }}
                />
                <span className="text-xs text-gray-700 capitalize">{section}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
