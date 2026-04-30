import TopBar from '@/components/TopBar';
import { createServerSupabase } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function updateSettings(formData: FormData) {
  'use server';
  const supabase = createServerSupabase();
  const update = {
    target_roas: Number(formData.get('target_roas')),
    contribution_margin: Number(formData.get('contribution_margin')),
    scale_multiplier: Number(formData.get('scale_multiplier')),
    kill_multiplier: Number(formData.get('kill_multiplier')),
    spend_floor_7d: Number(formData.get('spend_floor_7d')),
    frequency_ceiling: Number(formData.get('frequency_ceiling')),
    fatigue_freq_threshold: Number(formData.get('fatigue_freq_threshold')),
    min_days_before_action: Number(formData.get('min_days_before_action')),
    updated_at: new Date().toISOString(),
  };
  await supabase.from('settings').update(update).eq('id', 1);
  revalidatePath('/dashboard/settings');
}

export default async function SettingsPage() {
  const supabase = createServerSupabase();
  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
  const s: any = settings || {};

  return (
    <div>
      <TopBar title="Settings" maxDay="" />
      <div className="p-5 max-w-3xl">
        <form action={updateSettings} className="space-y-5 bg-white border border-slate-200 rounded-xl p-6">
          <div className="text-sm font-semibold text-slate-700 mb-2">Targets & Thresholds</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field name="target_roas" label="Target ROAS" defaultValue={s.target_roas} step="0.1" hint="What ROAS your campaigns should hit" />
            <Field name="contribution_margin" label="Contribution Margin" defaultValue={s.contribution_margin} step="0.05" hint="0.7 = 70% margin after COGS" />
            <Field name="scale_multiplier" label="Scale Multiplier" defaultValue={s.scale_multiplier} step="0.1" hint="Scale ads above target × this" />
            <Field name="kill_multiplier" label="Kill Multiplier" defaultValue={s.kill_multiplier} step="0.1" hint="Kill ads below target × this" />
            <Field name="spend_floor_7d" label="Spend Floor (7d, ₹)" defaultValue={s.spend_floor_7d} step="100" hint="Min 7d spend to consider for kill/scale" />
            <Field name="frequency_ceiling" label="Frequency Ceiling" defaultValue={s.frequency_ceiling} step="0.1" hint="Above this = saturated audience" />
            <Field name="fatigue_freq_threshold" label="Fatigue Freq Threshold" defaultValue={s.fatigue_freq_threshold} step="0.1" hint="Frequency at which fatigue kicks in" />
            <Field name="min_days_before_action" label="Min Days Before Action" defaultValue={s.min_days_before_action} step="1" hint="Don't act on ads younger than this" />
          </div>
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-md text-sm">
            Save settings
          </button>
        </form>

        <div className="mt-4 text-xs text-slate-500">
          Settings are used by the aggregation pipeline (next hourly run) and by the Growth OS recommendations.
        </div>
      </div>
    </div>
  );
}

function Field({ name, label, defaultValue, step, hint }: any) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        step={step}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {hint && <span className="text-[11px] text-slate-500 mt-0.5 block">{hint}</span>}
    </label>
  );
}
