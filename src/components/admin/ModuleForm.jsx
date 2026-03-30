import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

export default function ModuleForm({ module, onSaved, onCancel }) {
  const isEdit = !!module?.id;
  const [form, setForm] = useState({
    title: module?.title ?? '',
    description: module?.description ?? '',
    pass_threshold: module?.pass_threshold ?? 80,
    certificate_validity_days: module?.certificate_validity_days ?? 365,
  });
  const [saving, setSaving] = useState(false);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    if (isEdit) {
      const { error } = await supabase.from('modules').update(form).eq('id', module.id);
      if (error) { console.error(error); alert('Xəta baş verdi'); setSaving(false); return; }
      onSaved(null);
    } else {
      const { data, error } = await supabase.from('modules').insert([form]).select('id').single();
      if (error) { console.error(error); alert('Xəta baş verdi'); setSaving(false); return; }
      onSaved(data.id);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">
            {isEdit ? 'Modulu redaktə et' : 'Yeni modul'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ad *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors"
              placeholder="Modul adı"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Təsvir</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors resize-none"
              placeholder="Modul haqqında qısa məlumat"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Keçid faizi (%) *</label>
              <input
                type="number"
                required
                min="0"
                max="100"
                value={form.pass_threshold}
                onChange={e => set('pass_threshold', parseInt(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sertifikat müddəti (gün) *</label>
              <input
                type="number"
                required
                min="1"
                value={form.certificate_validity_days}
                onChange={e => set('certificate_validity_days', parseInt(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-[#069494] text-white text-sm font-bold rounded-xl hover:bg-[#057a7a] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saxlanılır...' : isEdit ? 'Yadda saxla' : 'Yarat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
