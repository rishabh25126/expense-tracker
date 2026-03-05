import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { isAuthed, unauth } from '@/lib/auth';
import { log } from '@/lib/logger';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TODAY = () => new Date().toISOString().split('T')[0];
const YESTERDAY = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

export async function POST(req: NextRequest) {
  if (!await isAuthed()) return unauth();

  const { text, categories } = await req.json() as { text: string; categories?: string[] };
  if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 });

  const today = TODAY();
  const yesterday = YESTERDAY();
  const catList = categories?.length ? categories : ['Food', 'Travel', 'Rent', 'Shopping', 'Bills', 'Other'];

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Extract expense data from this text. Today is ${today}.

Text: "${text}"

Available categories: ${catList.map(c => `"${c}"`).join(', ')}

Return ONLY valid JSON:
{
  "amount": number or null,
  "category": one of the available categories above (pick the best match) or null,
  "date": "${today}" for today, "${yesterday}" for yesterday, or YYYY-MM-DD,
  "description": short label for the expense
}

If amount is missing return null. No extra text.`
      }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await log('ERROR', 'parse-expense failed', { msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
