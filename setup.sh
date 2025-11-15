#!/bin/bash

echo "Setting up CMU Courses 3D Map..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed. Please install Python 3.9+ first."
    exit 1
fi

echo "Installing frontend dependencies..."
npm install

echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt
cd ..

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend Environment Variables
SUPABASE_URL=https://placeholder.supabase.co
SUPABASE_ANON_KEY=placeholder-key
EOF
    echo ".env file created. Please update it with your Supabase credentials."
else
    echo ".env file already exists. Skipping creation."
fi

echo ""
echo "Setup complete!"
echo ""
echo "To start the development servers, run:"
echo "  npm run dev"
echo ""
echo "This will start:"
echo "  - Next.js frontend on http://localhost:3000"
echo "  - FastAPI backend on http://localhost:8000"
echo ""

