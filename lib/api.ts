const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function chatWithAI(message: string, sessionId?: string) {
  const response = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
    }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to chat with AI')
  }
  
  return response.json()
}

export async function searchCourses(query: string) {
  const response = await fetch(`${API_URL}/api/courses/search?q=${encodeURIComponent(query)}`)
  
  if (!response.ok) {
    throw new Error('Failed to search courses')
  }
  
  return response.json()
}

export async function getCourseDetails(courseId: string) {
  const response = await fetch(`${API_URL}/api/courses/${courseId}`)
  
  if (!response.ok) {
    throw new Error('Failed to get course details')
  }
  
  return response.json()
}

export async function getCourseDocuments(courseId: string, topic?: string) {
  const params = new URLSearchParams({ course_id: courseId })
  if (topic) {
    params.append('topic', topic)
  }
  
  const response = await fetch(`${API_URL}/api/courses/${courseId}/documents?${params}`)
  
  if (!response.ok) {
    throw new Error('Failed to get course documents')
  }
  
  return response.json()
}

export async function generateSummary(courseId?: string, topic?: string, content?: string) {
  const response = await fetch(`${API_URL}/api/generate-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      course_id: courseId,
      topic: topic,
      content: content,
    }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to generate summary')
  }
  
  return response.json()
}

