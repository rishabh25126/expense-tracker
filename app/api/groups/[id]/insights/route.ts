import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthed, unauth } from '@/lib/auth';
import { log } from '@/lib/logger';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ExpenseRow = {
  id: string;
  group_id: string;
  amount: number;
  category: string;
  description: string | null;
  date: string; // YYYY-MM-DD
};

type GroupRow = {
  id: string;
  name: string;
  period_start: string;
  prev_period_start: string | null;
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await isAuthed()) return unauth();

  const isDigest = req.nextUrl.searchParams.get('type') === 'digest';

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const [{ data: group, error: groupError }, { data: expenses, error: expensesError }] =
      await Promise.all([
        supabase.from('groups').select('*').eq('id', id).single<GroupRow>(),
        supabase.from('expenses').select('*').eq('group_id', id).order('date', { ascending: true }) as unknown as Promise<{
          data: ExpenseRow[] | null;
          error: { message: string } | null;
        }>,
      ]);

    if (groupError || !group) {
      await log('ERROR', 'insights group fetch failed', { id, error: groupError?.message });
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    if (expensesError) {
      await log('ERROR', 'insights expenses fetch failed', { id, error: expensesError.message });
      return NextResponse.json({ error: expensesError.message }, { status: 500 });
    }

    const allExpenses = expenses ?? [];

    if (allExpenses.length === 0) {
      return NextResponse.json(isDigest ? { digest: '' } : { insights: [], debug: { reason: 'no_expenses' } });
    }

    // Weekly digest branch
    if (isDigest) {
      const today = new Date();
      const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
      const twoWeeksAgo = new Date(today); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const todayStr = today.toISOString().split('T')[0];
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];

      const thisWeek = allExpenses.filter(e => e.date >= weekAgoStr && e.date <= todayStr);
      const lastWeek = allExpenses.filter(e => e.date >= twoWeeksAgoStr && e.date < weekAgoStr);
      const sum = (rows: ExpenseRow[]) => rows.reduce((acc, e) => acc + Number(e.amount || 0), 0);
      const byCategory = (rows: ExpenseRow[]) => {
        const map: Record<string, number> = {};
        for (const e of rows) map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
        return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, amount]) => ({ name, amount }));
      };

      const digestData = {
        this_week: { total: sum(thisWeek), categories: byCategory(thisWeek), count: thisWeek.length },
        last_week: { total: sum(lastWeek), categories: byCategory(lastWeek), count: lastWeek.length },
        date_range: { from: weekAgoStr, to: todayStr },
      };

      try {
        const message = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          system: `You are a concise personal finance assistant. Write a 2-3 sentence weekly spending digest comparing this week to last week. Use concrete numbers in INR. Be direct, no generic advice.`,
          messages: [{ role: 'user', content: `Weekly spending data:\n${JSON.stringify(digestData)}\n\nReturn ONLY valid JSON: { "digest": "your summary here" }` }],
        });
        const raw = (message.content[0] as { type: string; text: string }).text.trim();
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(cleaned) as { digest?: string };
        return NextResponse.json({ digest: parsed.digest || '' });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await log('ERROR', 'digest generation failed', { msg });
        return NextResponse.json({ digest: '', error: msg }, { status: 500 });
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const periodStart = group.period_start || today;
    const prevStart = group.prev_period_start;

    const currentExpenses = allExpenses.filter(e => e.date >= periodStart);
    const previousExpenses = allExpenses.filter(e => {
      if (e.date >= periodStart) return false;
      if (prevStart && e.date < prevStart) return false;
      return true;
    });

    const sum = (rows: ExpenseRow[]) =>
      rows.reduce((acc, e) => acc + Number(e.amount || 0), 0);

    const currentTotal = sum(currentExpenses);
    const previousTotal = sum(previousExpenses);

    const byCategory = (rows: ExpenseRow[]) => {
      const map: Record<string, number> = {};
      for (const e of rows) {
        map[e.category] = (map[e.category] || 0) + Number(e.amount || 0);
      }
      return Object.entries(map)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount);
    };

    const currentCategories = byCategory(currentExpenses);
    const previousCategories = byCategory(previousExpenses);

    // Daily totals for last 14 days (for the group overall)
    const last14Days: { date: string; amount: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split('T')[0];
      const total = allExpenses
        .filter(e => e.date === date)
        .reduce((acc, e) => acc + Number(e.amount || 0), 0);
      last14Days.push({ date, amount: total });
    }

    // Monthly totals for last 6 months
    const last6Months: { month: string; label: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const month = d.toISOString().slice(0, 7); // YYYY-MM
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const total = allExpenses
        .filter(e => e.date.startsWith(month))
        .reduce((acc, e) => acc + Number(e.amount || 0), 0);
      last6Months.push({ month, label, amount: total });
    }

    const topExpenses = [...currentExpenses]
      .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
      .slice(0, 5)
      .map(e => ({
        amount: Number(e.amount || 0),
        category: e.category,
        description: e.description || '',
        date: e.date,
      }));

    const summary = {
      group: {
        id: group.id,
        name: group.name,
      },
      period: {
        start: periodStart,
        prev_start: prevStart,
        today,
      },
      totals: {
        current: currentTotal,
        previous: previousTotal,
      },
      categories: {
        current: currentCategories,
        previous: previousCategories,
      },
      daily_last_14_days: last14Days,
      monthly_last_6: last6Months,
      top_expenses: topExpenses,
      counts: {
        current_expenses: currentExpenses.length,
        previous_expenses: previousExpenses.length,
        all_expenses: allExpenses.length,
      },
    };

    try {
      const systemPrompt = `You are a concise personal finance assistant.
You receive JSON with spending data for one tracker (group) and should return short, clear insights.

Rules:
- Focus on current vs previous period, biggest categories, spikes, and trends.
- Use concrete numbers and percents where useful.
- Do NOT give generic life advice, only talk about the numbers you see.
- Keep each insight to a single short sentence.
- At most 5 insights.
- If there is very little data, say that instead of overinterpreting.`;

      const userContent = `Here is the spending JSON:

${JSON.stringify(summary)}

Return ONLY valid JSON of this shape:
{
  "insights": string[]
}`;

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
      });

      const raw = (message.content[0] as { type: string; text: string }).text.trim();
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleaned) as { insights?: string[] };

      const insights = Array.isArray(parsed.insights) ? parsed.insights.filter(i => typeof i === 'string') : [];

      return NextResponse.json({ insights });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await log('ERROR', 'insights generation failed', { msg });
      return NextResponse.json({ insights: [], error: msg }, { status: 500 });
    }
  } catch (e) {
    await log('ERROR', 'insights GET crashed', { error: String(e) });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

