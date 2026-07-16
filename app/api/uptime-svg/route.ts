export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  
  // Current time in IST (offset: UTC +5.5 hours)
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const istTime = new Date(utc + 3600000 * 5.5);
  
  // Robust year/day calculation
  const start = new Date('2007-04-07T00:00:00+05:30');
  let years = istTime.getFullYear() - start.getFullYear();
  
  // Adjust if anniversary hasn't happened yet this year
  const currentAnniversary = new Date(start.getFullYear() + years, start.getMonth(), start.getDate(), 0, 0, 0);
  // Match timezone offsets
  const anniversaryEpoch = currentAnniversary.getTime();
  
  if (istTime.getTime() < anniversaryEpoch) {
    years--;
  }
  
  const finalAnniversary = new Date(start.getFullYear() + years, start.getMonth(), start.getDate(), 0, 0, 0);
  const diffMs = istTime.getTime() - finalAnniversary.getTime();
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  const uptimeStr = `uptime: ${years} years, ${days} days, ${hours} hours, ${minutes} mins, ${seconds} secs, 1 active developer`;
  const loadStr = `load average: 0.18, 0.42, 0.99`;

  // SVG representation simulating code block font and styling
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="650" height="48" viewBox="0 0 650 48">
  <style>
    .terminal-text {
      font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
      font-size: 13.5px;
      fill: #adbac7; /* Blends nicely with GitHub dark and light modes */
    }
  </style>
  <text x="0" y="16" class="terminal-text">${uptimeStr}</text>
  <text x="0" y="38" class="terminal-text">${loadStr}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
