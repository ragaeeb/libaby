import { setTimeout } from 'node:timers/promises';
import { GoogleGenAI } from '@google/genai';
import { redactText } from '../textUtils';

enum GeminiModel {
    FlashLiteV2_5 = 'gemini-2.5-flash-lite',
    ProV2_5 = 'gemini-2.5-pro',
}

const RATE_LIMIT_KEYWORDS = ['429', 'rate limit', 'Too Many Requests', 'model is overloaded'];

export const generateWithGemini = async (
    prompt: string,
    apiKey: string,
    validate: (responseText: string) => boolean,
    { maxRetries = 3, timeout = 1000 * 60 * 10 } = {},
) => {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout } });
    const redactedKey = redactText(apiKey);
    const serializedSize = new TextEncoder().encode(prompt).length;
    const content = {
        config: { temperature: 0.1 },
        contents: prompt,
        model: process.env.GEMINI_MODEL || GeminiModel.FlashLiteV2_5,
    };

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            console.log(
                `[gemini: Sending ${serializedSize} bytes to ${content.model} with key=${redactedKey}] (attempt ${attempt + 1}/${maxRetries})`,
            );

            const response = await ai.models.generateContent(content);

            const text = response.text;

            if (!text) {
                console.warn(`[API ${redactedKey}] Empty response on attempt ${attempt + 1}`);
                console.warn(`[API ${redactedKey}] Full response object:`, JSON.stringify(response, null, 2));
                console.warn(`[API ${redactedKey}] PROMPT SENT:\n${prompt}`);
                continue;
            }

            if (validate(text)) {
                return text;
            }

            console.warn(
                `Invalid Response: [API ${redactedKey}] Response preview (first 1000 chars):`,
                text.substring(0, 1000),
                '(last 500 chars)',
                text.substring(Math.max(0, text.length - 500)),
            );
        } catch (error: any) {
            console.error(`[API ${redactedKey}] Error on attempt ${attempt + 1}:`, error.message);

            if (RATE_LIMIT_KEYWORDS.some((k) => error.message?.includes(k))) {
                const waitTime = Math.min(2 ** attempt * 1000, 30000);
                console.log(`[API ${redactedKey}] Rate limited. Waiting ${waitTime}ms...`);
                await setTimeout(waitTime);
                continue;
            }

            if (attempt < maxRetries - 1) {
                await setTimeout(2000);
            }
        }
    }
};
