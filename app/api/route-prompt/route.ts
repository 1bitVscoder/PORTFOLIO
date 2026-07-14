import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt, model, systemInstruction } = await request.json();
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured on server' }, { status: 400 });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let text = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: systemInstruction 
            ? { parts: [{ text: systemInstruction }] } 
            : undefined,
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.7,
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Direct API returned status ${response.status}`);
      }

      const data = await response.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (directError) {
      console.warn("Direct Gemini API failed, attempting local FreeLLMAPI backup proxy:", directError);

      const proxyBase = (process.env.OPENAI_API_BASE || 'https://my-freellmapi-proxy.onrender.com/v1').replace(/\/$/, '');
      const proxyKey = process.env.OPENAI_API_KEY || 'freellmapi-ec75ec409b980a3248a3b64f0a702afb51781feb35d3ec23';
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
          max_tokens: 1024
        }),
      });

      if (!proxyResponse.ok) {
        const errorData = await proxyResponse.json().catch(() => ({}));
        return NextResponse.json(
          { error: errorData.error?.message || 'FreeLLMAPI proxy call failed' },
          { status: proxyResponse.status }
        );
      }

      const data = await proxyResponse.json();
      text = data.choices?.[0]?.message?.content || '';
    }
    
    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
