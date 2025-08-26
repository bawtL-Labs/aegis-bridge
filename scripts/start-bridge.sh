#!/bin/bash

# Aegis Collaboration Bridge Startup Script

echo "Starting Aegis Collaboration Bridge..."

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

# Check if .env file exists, if not copy from example
if [ ! -f ".env" ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please edit .env file with your configuration before starting."
    exit 1
fi

# Start the bridge daemon
echo "Starting bridge daemon..."
npm start