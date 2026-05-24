import { Injectable, Logger } from '@nestjs/common';
import { Task } from './task.schema';

export interface VerificationResult { approved: boolean; confidence: number; reason: string; }

@Injectable()
export class GeminiVerifyService {
  private readonly logger = new Logger(GeminiVerifyService.name);

  async verifyPhoto(imageBase64: string, mimeType: string, task: Task): Promise<VerificationResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY not set');
      return { approved: false, confidence: 0, reason: 'AI verification not configured.' };
    }
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`;
      const prompt = this.buildPrompt(task);
      const body = { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }] };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { this.logger.error(`Gemini ${res.status}`); return { approved: false, confidence: 0, reason: 'AI verification failed.' }; }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) return { approved: false, confidence: 0, reason: 'AI returned empty response.' };
      return this.parseResponse(text);
    } catch (err) {
      this.logger.error('Gemini verification failed', err);
      return { approved: false, confidence: 0, reason: 'AI verification error.' };
    }
  }

  private buildPrompt(task: Task): string {
    const hint = task.geminiPromptHint ? `\nPAKISTAN-SPECIFIC VISUAL CUES:\n${task.geminiPromptHint}\n` : '';
    return `You are a STRICT verification AI for the EcoLife sustainability app (Pakistan context). Verify if a submitted photo is genuine proof that a specific eco-task was completed.

TASK TO VERIFY:
- Title: ${task.title}
- Description: ${task.description}
- Category: ${task.category}
- Required proof: ${task.proofInstructions}
${hint}
STRICT RULES — REJECT if:
1. Photo does NOT clearly show evidence related to this task
2. Photo is a random screenshot, meme, selfie, or unrelated image
3. Photo shows a screen/monitor (screenshot of a photo)
4. Photo is clearly AI-generated or stock photo
5. Photo has no visible connection to "${task.title}"
6. Photo is blurry beyond recognition or completely dark/blank

ONLY approve if the photo CLEARLY and DIRECTLY shows evidence of completing "${task.title}".

RESPOND IN EXACTLY THIS JSON FORMAT (no markdown, no extra text):
{"approved": false, "confidence": 30, "reason": "explanation"}`;
  }

  private parseResponse(response: string): VerificationResult {
    try {
      let cleaned = response.trim();
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
      cleaned = cleaned.trim();
      const parsed = JSON.parse(cleaned);
      return { approved: parsed.approved === true, confidence: Math.min(100, Math.max(0, parsed.confidence || 0)), reason: parsed.reason || 'No reason provided.' };
    } catch {
      this.logger.warn(`Failed to parse: ${response}`);
      return { approved: false, confidence: 0, reason: 'Could not process AI response.' };
    }
  }
}
