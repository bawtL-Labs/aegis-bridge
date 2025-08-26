#!/bin/bash

# Open WebUI Sidecar Startup Script

echo "Starting Open WebUI Sidecar..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the project
echo "Building project..."
npm run build

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found. Please create one from .env.example"
    exit 1
fi

# Start the OWUI sidecar
echo "Starting OWUI sidecar..."
node dist/owui-sidecar/index.js