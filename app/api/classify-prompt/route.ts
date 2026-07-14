import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured on server' }, { status: 400 });
    }

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

    const model = 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let text = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      if (!response.ok) {
        throw new Error(`Direct API returned status ${response.status}`);
      }

      const data = await response.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (directError) {
      console.warn("Direct Gemini classification failed, attempting local FreeLLMAPI backup proxy:", directError);

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
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `User Prompt: "${prompt}"` }
          ],
          temperature: 0.1,
          max_tokens: 128,
          response_format: { type: "json_object" }
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
      // Fallback
    }

    return NextResponse.json({ error: 'Failed to parse classification JSON', rawText: text }, { status: 500 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
