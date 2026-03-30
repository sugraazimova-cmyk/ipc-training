import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

function isValidURL(str) {
  try { new URL(str); return true; } catch { return false; }
}

export default function ContentItemForm({ item, moduleId, onSaved, onCancel }) {
  const isEdit = !!item?.id;
  const [form, setForm] = useState({
    title: item?.title ?? '',
    type: item?.type ?? 'video',
    body: item?.body ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const validate = () => {
    if (!form.title.trim()) return 'Başlıq boş ola bilməz';
    if (form.type === 'html' && !form.body.trim()) return 'HTML məzmun boş ola bilməz';
    if (form.type === 'pdf' && !isValidURL(form.body)) return 'Düzgün URL daxil edin (https://... ilə başlamalıdır)';
    if (form.type === 'video' && !form.body.trim()) return 'Video URL və ya YouTube ID boş ola bilməz';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError('');
    setSaving(true);

    try {
      if (isEdit) {
        const { data, error: err } = await supabase
          .from('content')
          .update({ title: form.title, type: form.type, body: form.body })
          .eq('id', item.id)
          .select('*')
          .single();
        if (err) throw err;
        onSaved(data);
      } else {
        // Get DB-computed display_order
        const { data: orderData } = await supabase
          .from('content')
          .select('display_order')
          .eq('module_id', parseInt(moduleId))
          .order('display_order', { ascending: false })
          .limit(1);
        const nextOrder = (orderData?.[0]?.display_order ?? 0) + 1;

        const { data, error: err } = await supabase
          .from('content')
          .insert([{ ...form, module_id: parseInt(moduleId), display_order: nextOrder }])
          .select('*')
          .single();
        if (err) throw err;
        onSaved(data);
      }
    } catch (err) {
      console.error(err);
      setError('Xəta baş verdi');
    } finally {
      setSaving(false);
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
            {isEdit ? 'Məzmunu redaktə et' : 'Yeni məzmun'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Başlıq *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors"
              placeholder="Məzmun başlığı"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Növ *</label>
            <select
              value={form.type}
              onChange={e => { set('type', e.target.value); set('body', ''); }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors bg-white"
            >
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="html">HTML mətn</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {form.type === 'html' ? 'HTML məzmun *' : form.type === 'video' ? 'Video URL / YouTube ID *' : 'PDF URL *'}
            </label>
            {form.type === 'html' ? (
              <textarea
                rows={6}
                value={form.body}
                onChange={e => set('body', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors resize-none"
                placeholder="HTML məzmun daxil edin..."
              />
            ) : (
              <input
                type="text"
                value={form.body}
                onChange={e => set('body', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors"
                placeholder={
                  form.type === 'video'
                    ? 'YouTube ID (dQw4w9WgXcQ) və ya https://...'
                    : 'https://...'
                }
              />
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-[#069494] text-white text-sm font-bold rounded-xl hover:bg-[#057a7a] disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saxlanılır...' : isEdit ? 'Yadda saxla' : 'Əlavə et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
