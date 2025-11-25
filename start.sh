#!/bin/bash

# Script de inicio rápido para el servidor

echo "🚀 Iniciando servidor de FYZAR CHAT..."
echo ""

# Verificar si Node.js está instalado
if command -v node &> /dev/null; then
    echo "✅ Node.js detectado"
    echo "📦 Iniciando servidor Node.js..."
    node server.js
elif command -v python3 &> /dev/null; then
    echo "✅ Python 3 detectado"
    echo "🐍 Iniciando servidor Python..."
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "✅ Python detectado"
    echo "🐍 Iniciando servidor Python..."
    python -m SimpleHTTPServer 8000
elif command -v php &> /dev/null; then
    echo "✅ PHP detectado"
    echo "🐘 Iniciando servidor PHP..."
    php -S localhost:8000
else
    echo "❌ No se encontró ningún servidor disponible"
    echo ""
    echo "Por favor instala uno de los siguientes:"
    echo "  • Node.js: https://nodejs.org/"
    echo "  • Python 3: https://www.python.org/"
    echo "  • PHP: https://www.php.net/"
    exit 1
fi
