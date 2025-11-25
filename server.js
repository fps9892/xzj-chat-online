// Servidor Node.js simple para manejar URLs dinámicas
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Manejar URLs de salas (index.html/nombreSala)
    let filePath = req.url;
    
    // Si la URL empieza con /index.html/ redirigir a index.html
    if (filePath.startsWith('/index.html/')) {
        filePath = '/index.html';
    }
    
    // Si es la raíz, servir index.html
    if (filePath === '/') {
        filePath = '/index.html';
    }

    // Construir ruta completa del archivo
    const fullPath = path.join(__dirname, filePath);
    const extname = String(path.extname(fullPath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Leer y servir el archivo
    fs.readFile(fullPath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Archivo no encontrado
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - Archivo no encontrado</h1>', 'utf-8');
            } else {
                // Error del servidor
                res.writeHead(500);
                res.end(`Error del servidor: ${error.code}`, 'utf-8');
            }
        } else {
            // Éxito
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📁 Sirviendo archivos desde: ${__dirname}`);
    console.log(`\n✨ URLs de ejemplo:`);
    console.log(`   http://localhost:${PORT}/login.html`);
    console.log(`   http://localhost:${PORT}/index.html`);
    console.log(`   http://localhost:${PORT}/index.html/general`);
    console.log(`   http://localhost:${PORT}/index.html/gaming`);
    console.log(`\n⏹️  Presiona Ctrl+C para detener el servidor\n`);
});
