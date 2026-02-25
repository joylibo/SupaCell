import { NextResponse } from 'next/server';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { model, prompt, config } = body;

        let apiUrl = '';
        let apiKey = '';
        let apiModelStr = '';

        if (model === 'deepseek3.2') {
            apiUrl = DEEPSEEK_API_URL;
            apiKey = process.env.DEEPSEEK_API_KEY || '';
            apiModelStr = 'deepseek-chat';
        } else if (model === 'qwen3.5-plus') {
            apiUrl = QWEN_API_URL;
            apiKey = process.env.DASHSCOPE_API_KEY || '';
            apiModelStr = 'qwen3.5-plus';
        } else {
            return NextResponse.json({ error: 'Unsupported model variant' }, { status: 400 });
        }

        if (!apiKey) {
            // Return mock response when API key is missing (e.g. local dev without config)
            await new Promise(resolve => setTimeout(resolve, 1500));
            return NextResponse.json({
                result: `[Mock result for ${model}] Evaluated prompt: ${prompt}`
            });
        }

        const payload = {
            model: apiModelStr,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: config?.max_tokens ?? 2048,
            temperature: config?.temperature ?? 0.7,
            top_p: config?.top_p ?? 0.9,
            frequency_penalty: config?.frequency_penalty ?? 0,
            presence_penalty: config?.presence_penalty ?? 0,
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('AI API Error:', errText);
            return NextResponse.json({ error: `API request failed: ${response.statusText}` }, { status: response.status });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        return NextResponse.json({ result: content });
    } catch (err: any) {
        console.error('API Error handler:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
