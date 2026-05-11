import { Injectable, Logger } from '@nestjs/common';
import { Task } from './task.entity';

export interface VerificationResult {
  approved: boolean;
  confidence: number;
  reason: string;
}

@Injectable()
export class GeminiVerifyService {
  private readonly logger = new Logger(GeminiVerifyService.name);

  async verifyPhoto(imageBase64: string, mimeType: string, task: Task): Promise<VerificationResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY not set');
      return { approved: false, confidence: 0, reason: 'AI verification not configured. Please contact support.' };
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const prompt = `You are a STRICT verification AI for the EcoLife sustainability app. Your job is to verify if a submitted photo is genuine proof that a specific eco-task was completed.

TASK TO VERIFY:
- Title: ${task.title}
- Description: ${task.description}
- Category: ${task.category}
- Required proof: ${task.proofInstructions}

STRICT RULES — You MUST reject if:
1. The photo does NOT clearly show evidence related to this specific task
2. The photo is a random screenshot, meme, selfie, or unrelated image
3. The photo shows a screen/monitor displaying an image (screenshot of a photo)
4. The photo is clearly AI-generated or a stock photo
5. The photo has no visible connection to "${task.title}"
6. The photo is blurry beyond recognition or completely dark/blank

ONLY approve if the photo CLEARLY and DIRECTLY shows evidence of completing "${task.title}".
For example:
- "Eat a plant-based meal" → photo must show an actual plant-based meal on a plate/bowl
- "Recycle correctly" → photo must show actual recycling bins or sorted recyclables
- "Use a reusable bag" → photo must show a reusable bag being used for shopping
- "Pick up litter" → photo must show collected litter or a cleanup effort

A random or unrelated photo should ALWAYS be rejected.

RESPOND IN EXACTLY THIS JSON FORMAT (no markdown, no code blocks, no extra text):
{"approved": false, "confidence": 30, "reason": "This photo shows X which is not related to the task Y"}

or if genuinely verified:
{"approved": true, "confidence": 90, "reason": "Photo clearly shows evidence of completing the task"}`;

      const body = {
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        }],
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        this.logger.error(`Gemini API error ${res.status}: ${errText}`);
        return { approved: false, confidence: 0, reason: 'AI verification failed. Please try again.' };
      }

      const data = await res.json();
      this.logger.log(`Gemini raw response: ${JSON.stringify(data.candidates?.[0]?.content?.parts?.[0]?.text)}`);

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) {
        return { approved: false, confidence: 0, reason: 'AI returned empty response. Please try again.' };
      }

      return this.parseResponse(text);
    } catch (err) {
      this.logger.error('Gemini verification failed', err);
      return { approved: false, confidence: 0, reason: 'AI verification error. Please try again later.' };
    }
  }

  private parseResponse(response: string): VerificationResult {
    try {
      let cleaned = response.trim();
      // Remove markdown code blocks if present
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
      }
      cleaned = cleaned.trim();
      const parsed = JSON.parse(cleaned);
      return {
        approved: parsed.approved === true,
        confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
        reason: parsed.reason || 'No reason provided.',
      };
    } catch {
      this.logger.warn(`Failed to parse Gemini response: ${response}`);
      return { approved: false, confidence: 0, reason: 'Could not process AI response. Please try again.' };
    }
  }
}
