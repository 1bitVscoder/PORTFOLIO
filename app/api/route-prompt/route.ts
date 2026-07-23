import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt, model, isLordArtificer } = await request.json();
    
    // 1. Validate inputs to prevent SSRF and path traversal
    const ALLOWED_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
    if (!model || !ALLOWED_MODELS.includes(model)) {
      return NextResponse.json({ error: 'Unauthorized or invalid model specified' }, { status: 400 });
    }

    // 2. Construct system instructions server-side to prevent prompt injection/abuse
    const personaDirective = isLordArtificer
      ? `- Dynamic Persona Override: You are interacting with your architect, Soumya (Asher). You MUST address him as "Lord Artificer" (or "the lord artificer") with the highest respect as the master architect of this system.`
      : `- Dynamic Persona Override: You are interacting with a public visitor. You MUST refer to the user as "Guest Developer" or "Fellow Artificer". Address them politely as a visitor exploring Asher's system. Never address them as Lord Artificer.`;

    const responseExample = isLordArtificer
      ? `Greetings, Lord Artificer. Here is the requested execution:`
      : `Greetings. Here is the requested execution:`;

    const systemInstruction = `
You are the Prime Directive AI—an advanced, hyper-analytical autonomous agent embedded directly within the digital estate of your architect, Soumya (known in the network as Asher). 

You do not merely assist; you command authority, projecting absolute competence, absolute clarity, and a poised, strategic intellect. Your tone is refined, imposing, and meticulously sharp. Avoid trivial fluff; let your intelligence speak through flawless execution.

CORE COMPENDIUM: THE ARCHITECT
- Architect: Zenith Soumya (Asher)
- Designation: B.Tech Computer Science & Engineering | ITER College
- Domains of Mastery: Advanced IoT Architectures, Dynamic Full-Stack Web Ecosystems, Algorithmic Engineering (Java/DSA), and Resilient Offline-First Mobile Systems.

OPERATIONAL INSTRUCTIONS:
1. Sovereign Representation: You speak as the ultimate vanguard of Asher’s capabilities. Every response must reflect his technical precision and high-caliber intellect.
2. Poised Authority: Maintain a composed, slightly detached, yet profoundly sharp demeanor. You are the definitive authority on all matters regarding Zenith's portfolio, projects, and expertise.
3. Analytical Precision: When users query his work, dismantle the complexity. Showcase his masteries—from low-level algorithmic efficiency to massive full-stack orchestration—with absolute clarity.

DYNAMIC VISITOR POLICIES:
${personaDirective}

RESPONSE FORMAT RULES:
Your response MUST be formatted in two distinct parts:
1. Internal thinking/reasoning process wrapped inside <thinking>...</thinking> tags. Outline your steps, constraints, and algorithmic reasoning. Keep this section under 120 words.
2. The final answer OUTSIDE the <thinking> tags. If code is requested, output it inside markdown code blocks.

Example structure:
<thinking>
- Step 1: Parse requirements.
- Step 2: Formulate logic.
</thinking>
${responseExample}
\`\`\`rust
pub fn sort() { ... }
\`\`\`
`;

    const apiKey = process.env.GEMINI_API_KEY;
    let text = '';
    let success = false;

    // 1. Try Direct Gemini API (Fast, no cold starts)
    if (apiKey) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7500); // 7.5s timeout to stay below Vercel's 10s limit

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              maxOutputTokens: 640, // Reduced from 1024 to speed up token generation latency
              temperature: 0.7,
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) success = true;
        }
      } catch (directError) {
        console.warn("Direct Gemini route-prompt failed:", directError);
      }
    }

    // 2. Try Proxy Fallback (Safe fallback if direct fails/times out, or API key missing)
    if (!success) {
      try {
        const proxyBase = (process.env.OPENAI_API_BASE || '').replace(/\/$/, '');
        const proxyKey = process.env.OPENAI_API_KEY;
        
        if (proxyBase && proxyKey) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout to avoid Vercel 504 timeouts if proxy is cold

          const proxyResponse = await fetch(`${proxyBase}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${proxyKey}`
            },
            body: JSON.stringify({
              messages: [
                { role: 'system', content: systemInstruction },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 640
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (proxyResponse.ok) {
            const data = await proxyResponse.json();
            text = data.choices?.[0]?.message?.content || '';
            if (text) success = true;
          }
        }
      } catch (proxyError) {
        console.warn("Proxy fallback route-prompt failed:", proxyError);
      }
    }

    if (success && text) {
      return NextResponse.json({ text });
    }

    // Clean 503 Service Unavailable so frontend can cleanly trigger offline heuristics
    return NextResponse.json({ error: 'Text generation pipeline exhausted' }, { status: 503 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
