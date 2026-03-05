import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TODAY = () => new Date().toISOString().split('T')[0];
const YESTERDAY = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text } = await req.json() as { text: string };
  if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 });

  const today = TODAY();
  const yesterday = YESTERDAY();

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `Extract expense data from this text. Today is ${today}.

Text: "${text}"

Return ONLY valid JSON:
{
  "amount": number or null,
  "category": one of ["Food","Travel","Rent","Shopping","Bills","Other"] or null,
  "date": "${today}" for today, "${yesterday}" for yesterday, or YYYY-MM-DD,
  "description": short label for the expense
}

Category hints: coffee/food/grocery/restaurant/dinner/lunch → Food | uber/fuel/petrol/cab/taxi/flight → Travel | rent/mortgage → Rent | electricity/internet/phone/bill → Bills | amazon/shopping/clothes → Shopping
If amount is missing return null. No extra text.`
    }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();

  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 422 });
  }
}
