import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    
    const systemInstruction = `
Classify the user prompt into three categories: 'code' (for programming, algorithms, database queries, syntax questions), 'creative' (for marketing copies, design concepts, creative writing, brainstorming), and 'debug' (for error messages, docker issues, logs diagnostics, troubleshooting).
You must output your confidence scores as a JSON object with keys 'code', 'creative', and 'debug' where the values are integers summing up to 100.
Example:
{
  "code": 85,
  "creative": 5,
  "debug": 10
}
Output only the raw JSON. Do not include markdown block markers like \`\`\`json or \`\`\`. Do not include any thoughts or explanation.
`;

    const apiKey = process.env.GEMINI_API_KEY;
    let text = '';
    let success = false;

    // 1. Try Direct Gemini API (Fast, no cold starts)
    if (apiKey) {
      try {
        const model = 'gemini-2.5-flash';
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6500); // 6.5s timeout

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `User Prompt: "${prompt}"` }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              maxOutputTokens: 128,
              temperature: 0.1,
              responseMimeType: "application/json"
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
        console.warn("Direct Gemini classification failed:", directError);
      }
    }

    // 2. Try Proxy Fallback (Safe fallback if direct fails/times out, or API key missing)
    if (!success) {
      try {
        const proxyBase = (process.env.OPENAI_API_BASE || 'https://my-freellmapi-proxy.onrender.com/v1').replace(/\/$/, '');
        const proxyKey = process.env.OPENAI_API_KEY || 'freellmapi-14d91a0aefa1116e137183b061b0d29df743a98815abcfbe';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout to avoid Vercel 504 timeouts if proxy is cold

        const proxyResponse = await fetch(`${proxyBase}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${proxyKey}`
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: `User Prompt: "${prompt}"` }
            ],
            temperature: 0.1,
            max_tokens: 128,
            response_format: { type: "json_object" }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (proxyResponse.ok) {
          const data = await proxyResponse.json();
          text = data.choices?.[0]?.message?.content || '';
          if (text) success = true;
        }
      } catch (proxyError) {
        console.warn("Proxy fallback classification failed:", proxyError);
      }
    }

    // Parse scores if classification was successful
    if (success && text) {
      try {
        const scores = JSON.parse(text.trim());
        if (
          typeof scores.code === 'number' &&
          typeof scores.creative === 'number' &&
          typeof scores.debug === 'number'
        ) {
          return NextResponse.json(scores);
        }
      } catch {
        // parsing failed
      }
    }

    // Clean 503 Service Unavailable so frontend can cleanly trigger offline heuristics
    return NextResponse.json({ error: 'Classification pipeline exhausted' }, { status: 503 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
