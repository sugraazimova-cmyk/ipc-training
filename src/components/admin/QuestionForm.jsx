import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

export default function QuestionForm({ item, testId, moduleId, testType, onSaved, onTestCreated, onCancel }) {
  const isEdit = !!item?.id;
  const [questionText, setQuestionText] = useState(item?.text ?? '');
  const [options, setOptions] = useState(
    item?.options ?? [
      { text: '', is_correct: true },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
    ]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const markCorrect = (i) =>
    setOptions(prev => prev.map((o, j) => ({ ...o, is_correct: j === i })));

  const updateText = (i, text) =>
    setOptions(prev => prev.map((o, j) => j === i ? { ...o, text } : o));

  const addOption = () =>
    setOptions(prev => [...prev, { text: '', is_correct: false }]);

  const removeOption = (i) => {
    if (options.length <= 2) return;
    const updated = options.filter((_, j) => j !== i);
    if (options[i].is_correct && updated.length > 0) {
      updated[0] = { ...updated[0], is_correct: true };
    }
    setOptions(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!questionText.trim()) { setError('Sual mətni boş ola bilməz'); return; }
    if (options.length < 2) { setError('Ən azı 2 variant olmalıdır'); return; }
    if (options.some(o => !o.text.trim())) { setError('Bütün variantların mətni doldurulmalıdır'); return; }
    if (options.filter(o => o.is_correct).length !== 1) { setError('Dəqiq 1 düzgün cavab seçilməlidir'); return; }

    setSaving(true);

    try {
      let resolvedTestId = testId;
      let createdTest = null;

      // Auto-create test row if it doesn't exist yet
      if (!resolvedTestId) {
        const { data: newTest, error: testErr } = await supabase
          .from('tests')
          .insert([{ module_id: parseInt(moduleId), type: testType }])
          .select('*')
          .single();
        if (testErr) throw testErr;
        resolvedTestId = newTest.id;
        createdTest = newTest;
      }

      // Get DB-computed display_order
      const { data: orderData } = await supabase
        .from('questions')
        .select('display_order')
        .eq('test_id', resolvedTestId)
        .order('display_order', { ascending: false })
        .limit(1);
      const nextOrder = (orderData?.[0]?.display_order ?? 0) + 1;

      const payload = {
        test_id: resolvedTestId,
        text: questionText.trim(),
        options,
        display_order: isEdit ? item.display_order : nextOrder,
      };

      let savedQ;
      if (isEdit) {
        const { data, error: updateErr } = await supabase
          .from('questions').update(payload).eq('id', item.id).select('*').single();
        if (updateErr) throw updateErr;
        savedQ = data;
      } else {
        const { data, error: insertErr } = await supabase
          .from('questions').insert([payload]).select('*').single();
        if (insertErr) {
          // Rollback: delete test if we just created it (prevent orphan)
          if (createdTest) {
            await supabase.from('tests').delete().eq('id', createdTest.id);
          }
          throw insertErr;
        }
        savedQ = data;
      }

      // Notify parent about newly created test row
      if (createdTest) onTestCreated?.(createdTest);
      onSaved(savedQ);
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-gray-800">
            {isEdit ? 'Sualı redaktə et' : 'Yeni sual'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Question text */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sual *</label>
            <textarea
              rows={3}
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors resize-none"
              placeholder="Sualı daxil edin..."
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Variantlar <span className="font-normal text-gray-400">(düzgün cavabı radio ilə seçin)</span>
            </label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct_option"
                    checked={opt.is_correct}
                    onChange={() => markCorrect(i)}
                    className="w-4 h-4 flex-shrink-0 accent-[#069494]"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => updateText(i, e.target.value)}
                    placeholder={`Variant ${i + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#069494] transition-colors"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addOption}
              className="mt-2 text-xs text-[#069494] font-semibold hover:underline"
            >
              + Variant əlavə et
            </button>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Actions */}
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
