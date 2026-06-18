import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request) {
  try {
    const filePath = join(process.cwd(), 'public', 'widget.js');
    const widgetCode = readFileSync(filePath, 'utf-8');

    return new Response(widgetCode, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('[GET /api/widget] Error:', error);
    return new Response('console.error("Error cargando widget");', {
      status: 500,
      headers: { 'Content-Type': 'application/javascript' },
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
