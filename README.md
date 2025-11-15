# CMU CS Courses 3D Map

An interactive 3D visualization of CMU's Computer Science courses with AI-powered chat interface. Query courses naturally and automatically navigate to relevant content in a 3D mindmap visualization.

## Features

- **3D Course Visualization**: Interactive 3D map showing course relationships and connections
- **AI Chat Interface**: Natural language queries about courses (e.g., "Tell me about 15-213's cache chapter")
- **Automatic Navigation**: AI automatically zooms into relevant courses and surfaces documents
- **Course Documents**: Access lecture notes, assignments, and materials organized by topic

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **3D Visualization**: React Three Fiber, Three.js, Drei
- **Backend**: FastAPI, Python
- **Database**: Supabase (PostgreSQL)
- **AI**: Integrated chat system for course queries

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- Python 3.9+
- Supabase account (for database)

### Installation

1. Clone the repository:
```bash
cd Claudev1
```

2. Install frontend dependencies:
```bash
npm install
# Note: The r3f-forcegraph package will be installed automatically
```

3. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
# Run the setup script (creates .env automatically)
./setup.sh

# Or manually create .env file
cp .env.example .env
# Edit .env with your Supabase credentials
```

5. Set up the database schema:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run the SQL from `backend/schema.sql` to create tables and sample data

6. Run the development servers:
```bash
# From root directory
npm run dev
```

This will start:
- Next.js frontend on http://localhost:3000
- FastAPI backend on http://localhost:8000

## Usage

1. Open http://localhost:3000 in your browser
2. Click the chat button (bottom right) or press `Cmd+Shift+H` (Mac) / `Ctrl+Shift+H` (Windows)
3. Ask questions like:
   - "Tell me about 15-213's cache chapter"
   - "Show me courses related to systems"
   - "What is 15-122 about?"

The AI will automatically:
- Navigate to the relevant course in the 3D map
- Surface related documents and materials
- Provide detailed information about topics

## Project Structure

```
Claudev1/
├── app/                 # Next.js app directory
│   ├── page.tsx         # Main page with 3D map
│   ├── layout.tsx       # Root layout
│   └── globals.css      # Global styles
├── components/          # React components
│   ├── CourseMap3D.tsx  # 3D visualization component
│   └── AIChat.tsx       # AI chat interface
├── lib/                 # Utilities
│   ├── api.ts          # API client functions
│   └── supabase.ts     # Supabase client
├── backend/            # FastAPI backend
│   ├── main.py         # Main API server
│   └── requirements.txt # Python dependencies
└── package.json        # Node.js dependencies
```

## API Endpoints

- `POST /api/chat` - Chat with AI about courses
- `GET /api/courses/search?q={query}` - Search courses
- `GET /api/courses/{course_id}` - Get course details
- `GET /api/courses/{course_id}/documents?topic={topic}` - Get course documents

## Development

The project uses:
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Three Fiber** for 3D graphics
- **Framer Motion** for animations

## License

MIT

