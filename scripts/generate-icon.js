const fs = require('fs');
const path = require('path');

// Crear un PNG simple de 192x192 usando canvas
const { createCanvas } = require('canvas');

const canvas = createCanvas(192, 192);
const ctx = canvas.getContext('2d');

// Fondo azul
ctx.fillStyle = '#2563eb';
ctx.fillRect(0, 0, 192, 192);

// Texto "💬" en el centro
ctx.font = 'bold 100px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillStyle = 'white';
ctx.fillText('💬', 96, 96);

// Guardar PNG
const buffer = canvas.toBuffer('image/png');
const iconPath = path.join(__dirname, '../public/icon-192.png');
fs.writeFileSync(iconPath, buffer);

console.log('✓ Ícono generado en:', iconPath);
