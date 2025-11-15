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
  
  const data = await response.json()
  return {
    ...data,
    tool_details: data.tool_details || []
  }
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

export async function getCourse(courseId: string) {
  return getCourseDetails(courseId)
}

// Removed duplicate - using the one below that matches backend endpoint

export async function generateSummary(courseId?: string, topic?: string, content?: string, format: 'markdown' | 'pdf' = 'markdown') {
  const response = await fetch(`${API_URL}/api/generate-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      course_id: courseId,
      topic: topic,
      content: content,
      format: format,
    }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to generate summary')
  }
  
  // If PDF, return blob
  if (format === 'pdf') {
    const blob = await response.blob()
    return { blob, format: 'pdf' }
  }
  
  // Otherwise return JSON
  return response.json()
}

export async function uploadDocument(courseId: string, category: 'recitations' | 'class_notes' | 'homeworks', file: File) {
  const formData = new FormData()
  formData.append('course_id', courseId)
  formData.append('category', category)
  formData.append('file', file)
  
  const response = await fetch(`${API_URL}/api/upload-document`, {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    throw new Error('Failed to upload document')
  }
  
  return response.json()
}

export async function getCourseDocuments(courseId: string) {
  const response = await fetch(`${API_URL}/api/courses/${courseId}/documents`)
  
  if (!response.ok) {
    throw new Error('Failed to get course documents')
  }
  
  return response.json()
}

export async function downloadDocument(fileId: string) {
  const response = await fetch(`${API_URL}/api/documents/${fileId}/download`)
  
  if (!response.ok) {
    throw new Error('Failed to download document')
  }
  
  const blob = await response.blob()
  return blob
}

export async function deleteDocument(fileId: string) {
  const response = await fetch(`${API_URL}/api/documents/${fileId}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    throw new Error('Failed to delete document')
  }
  
  return response.json()
}

