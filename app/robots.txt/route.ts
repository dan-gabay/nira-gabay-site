import { renderRobotsTxt } from '@/lib/robots'

// Served by hand rather than by app/robots.ts so it can carry Content-Signal
// lines; the rules themselves live in lib/robots.ts.
export const dynamic = 'force-static'

export function GET() {
  return new Response(renderRobotsTxt(), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
