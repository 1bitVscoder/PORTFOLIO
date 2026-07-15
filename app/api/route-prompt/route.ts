import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt, model, systemInstruction } = await request.json();
    
    const apiKey = process.env.GEMINI_API_KEY;
    let text = '';
    let success = false;

    // 1. Try Direct Gemini API (Fast, no cold starts)
    if (apiKey && model) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7500); // 7.5s timeout to stay below Vercel's 10s limit

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: systemInstruction 
              ? { parts: [{ text: systemInstruction }] } 
              : undefined,
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
                ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
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
