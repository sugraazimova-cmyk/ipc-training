import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Pencil, Trash2, Plus, Video, FileText, Code2, ChevronUp, ChevronDown } from 'lucide-react';
import QuestionForm from './QuestionForm';
import ContentItemForm from './ContentItemForm';

const TABS = [
  { key: 'info',    label: 'Əsas məlumat' },
  { key: 'content', label: 'Məzmun' },
  { key: 'pre',     label: 'Pre-test' },
  { key: 'post',    label: 'Post-test' },
];

const CONTENT_TYPE_ICONS  = { video: Video, pdf: FileText, html: Code2 };
const CONTENT_TYPE_LABELS = { video: 'Video', pdf: 'PDF', html: 'HTML' };

// Swap display_order values between two rows in any table
const swapOrder = async (itemA, itemB, table) => {
  await Promise.all([
    supabase.from(table).update({ display_order: itemB.display_order }).eq('id', itemA.id),
    supabase.from(table).update({ display_order: itemA.display_order }).eq('id', itemB.id),
  ]);
};

export default function ModuleEditor() {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [module, setModule]     = useState(null);
  const [contents, setContents] = useState([]);
  const [preTest, setPreTest]   = useState(null);
  const [postTest, setPostTest] = useState(null);
  const [preQs, setPreQs]       = useState([]);
  const [postQs, setPostQs]     = useState([]);
  const [tab, setTab]           = useState('info');
  const [loading, setLoading]   = useState(true);

  const [contentModal, setContentModal]   = useState(null);
  const [questionModal, setQuestionModal] = useState(null);
  const [deletingId, setDeletingId]       = useState(null);
  const [reorderingId, setReorderingId]   = useState(null);

  // Info tab
  const [infoForm, setInfoForm]   = useState(null);
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoError, setInfoError]   = useState('');
  const [isDirty, setIsDirty]       = useState(false);

  // Unsaved changes warning on tab/window close
  useEffect(() => {
    const handler = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => { fetchAll(); }, [moduleId]);

  const fetchAll = async () => {
    setLoading(true);
    setIsDirty(false);
    const [modRes, testsRes, contentRes] = await Promise.all([
      supabase.from('modules').select('*').eq('id', moduleId).single(),
      supabase.from('tests').select('*').eq('module_id', moduleId),
      supabase.from('content').select('*').eq('module_id', moduleId).order('display_order'),
    ]);

    const mod   = modRes.data;
    const tests = testsRes.data || [];
    const pre   = tests.find(t => t.type === 'pre')  || null;
    const post  = tests.find(t => t.type === 'post') || null;

    setModule(mod);
    setInfoForm(mod ? {
      title: mod.title,
      description: mod.description ?? '',
      pass_threshold: mod.pass_threshold,
      certificate_validity_days: mod.certificate_validity_days,
    } : null);
    setContents(contentRes.data || []);
    setPreTest(pre);
    setPostTest(post);

    const [preQsRes, postQsRes] = await Promise.all([
      pre  ? supabase.from('questions').select('*').eq('test_id', pre.id).order('display_order')
           : Promise.resolve({ data: [] }),
      post ? supabase.from('questions').select('*').eq('test_id', post.id).order('display_order')
           : Promise.resolve({ data: [] }),
    ]);
    setPreQs(preQsRes.data || []);
    setPostQs(postQsRes.data || []);
    setLoading(false);
  };

  // ── Info tab save ──
  const saveInfo = async (e) => {
    e.preventDefault();
    setInfoSaving(true);
    setInfoError('');
    const { error } = await supabase.from('modules').update(infoForm).eq('id', moduleId);
    if (error) {
      setInfoError(error.message);
    } else {
      setModule(prev => ({ ...prev, ...infoForm }));
      setIsDirty(false);
    }
    setInfoSaving(false);
  };

  const updateInfoField = (key, value) => {
    setInfoForm(p => ({ ...p, [key]: value }));
    setIsDirty(true);
  };

  // ── Content reorder ──
  const moveContentUp = async (idx) => {
    if (idx === 0 || reorderingId) return;
    setReorderingId(contents[idx].id);
    await swapOrder(contents[idx], contents[idx - 1], 'content');
    const updated = [...contents];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    setContents(updated);
    setReorderingId(null);
  };

  const moveContentDown = async (idx) => {
    if (idx === contents.length - 1 || reorderingId) return;
    setReorderingId(contents[idx].id);
    await swapOrder(contents[idx], contents[idx + 1], 'content');
    const updated = [...contents];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    setContents(updated);
    setReorderingId(null);
  };

  // ── Question reorder ──
  const moveQuestionUp = async (idx) => {
    if (idx === 0 || reorderingId) return;
    const list = tab === 'pre' ? preQs : postQs;
    const setter = tab === 'pre' ? setPreQs : setPostQs;
    setReorderingId(list[idx].id);
    await swapOrder(list[idx], list[idx - 1], 'questions');
    const updated = [...list];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    setter(updated);
    setReorderingId(null);
  };

  const moveQuestionDown = async (idx) => {
    const list = tab === 'pre' ? preQs : postQs;
    if (idx === list.length - 1 || reorderingId) return;
    const setter = tab === 'pre' ? setPreQs : setPostQs;
    setReorderingId(list[idx].id);
    await swapOrder(list[idx], list[idx + 1], 'questions');
    const updated = [...list];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    setter(updated);
    setReorderingId(null);
  };

  // ── Delete with optimistic rollback ──
  const handleDeleteContent = async (id) => {
    if (!confirm('Bu məzmunu silmək istədiyinizə əminsiniz?')) return;
    const backup = contents.find(c => c.id === id);
    setDeletingId(id);
    setContents(prev => prev.filter(c => c.id !== id));
    const { error } = await supabase.from('content').delete().eq('id', id);
    if (error) {
      setContents(prev => [...prev, backup].sort((a, b) => a.display_order - b.display_order));
      alert('Xəta baş verdi');
    }
    setDeletingId(null);
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm('Bu sualı silmək istədiyinizə əminsiniz?')) return;
    const isPreTab = tab === 'pre';
    const list = isPreTab ? preQs : postQs;
    const setter = isPreTab ? setPreQs : setPostQs;
    const backup = list.find(q => q.id === id);
    setDeletingId(id);
    setter(prev => prev.filter(q => q.id !== id));
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) {
      setter(prev => [...prev, backup].sort((a, b) => a.display_order - b.display_order));
      alert('Xəta baş verdi');
    }
    setDeletingId(null);
  };

  // ── Modal callbacks ──
  const handleContentSaved = (savedItem) => {
    setContents(prev => {
      const idx = prev.findIndex(c => c.id === savedItem.id);
      if (idx >= 0) return prev.map(c => c.id === savedItem.id ? savedItem : c);
      return [...prev, savedItem];
    });
    setContentModal(null);
  };

  const handleQuestionSaved = (savedQ) => {
    const setter = tab === 'pre' ? setPreQs : setPostQs;
    setter(prev => {
      const idx = prev.findIndex(q => q.id === savedQ.id);
      if (idx >= 0) return prev.map(q => q.id === savedQ.id ? savedQ : q);
      return [...prev, savedQ];
    });
    setQuestionModal(null);
  };

  const handleTestCreated = (newTest) => {
    if (newTest.type === 'pre')  setPreTest(newTest);
    if (newTest.type === 'post') setPostTest(newTest);
  };

  const activeQs     = tab === 'pre' ? preQs : postQs;
  const orderBtnBase = 'p-1.5 rounded-lg transition-colors disabled:opacity-30';

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Yüklənir...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/admin/modules')}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {module?.title}
              {isDirty && <span className="ml-2 text-xs font-normal text-amber-500">● saxlanılmamış dəyişikliklər</span>}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Modul redaktoru</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === t.key
                  ? 'bg-[#069494] text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-[#069494]/40 hover:text-gray-700'
              }`}
            >
              {t.label}
              {t.key === 'content' && contents.length > 0 &&
                <span className="ml-1.5 text-xs opacity-70">({contents.length})</span>}
              {t.key === 'pre'  && preQs.length  > 0 &&
                <span className="ml-1.5 text-xs opacity-70">({preQs.length})</span>}
              {t.key === 'post' && postQs.length > 0 &&
                <span className="ml-1.5 text-xs opacity-70">({postQs.length})</span>}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">

          {/* ── Info tab ── */}
          {tab === 'info' && infoForm && (
            <form onSubmit={saveInfo} className="max-w-lg space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ad *</label>
                <input
                  type="text"
                  required
                  value={infoForm.title}
                  onChange={e => updateInfoField('title', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Təsvir</label>
                <textarea
                  rows={3}
                  value={infoForm.description}
                  onChange={e => updateInfoField('description', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors resize-none"
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
                    value={infoForm.pass_threshold}
                    onChange={e => updateInfoField('pass_threshold', parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sertifikat müddəti (gün) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={infoForm.certificate_validity_days}
                    onChange={e => updateInfoField('certificate_validity_days', parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors"
                  />
                </div>
              </div>
              {infoError && (
                <p className="text-red-500 text-sm">Xəta baş verdi: {infoError}</p>
              )}
              <button
                type="submit"
                disabled={infoSaving}
                className="px-6 py-2.5 bg-[#069494] text-white text-sm font-bold rounded-xl hover:bg-[#057a7a] disabled:opacity-50 transition-colors"
              >
                {infoSaving ? 'Saxlanılır...' : 'Yadda saxla'}
              </button>
            </form>
          )}

          {/* ── Content tab ── */}
          {tab === 'content' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700">Məzmun elementləri</h2>
                <button
                  onClick={() => setContentModal({})}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#069494] text-white text-xs font-bold rounded-lg hover:bg-[#057a7a] transition-colors"
                >
                  <Plus size={14} /> Əlavə et
                </button>
              </div>

              {contents.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">Heç bir element yoxdur</p>
                  <button
                    onClick={() => setContentModal({})}
                    className="mt-3 text-sm text-[#069494] font-semibold hover:underline"
                  >
                    + İlk məzmunu əlavə et
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {contents.map((item, idx) => {
                    const Icon = CONTENT_TYPE_ICONS[item.type] ?? FileText;
                    return (
                      <div key={item.id} className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        {/* Order buttons */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => moveContentUp(idx)}
                            disabled={idx === 0 || !!reorderingId || !!deletingId}
                            className={`${orderBtnBase} hover:bg-gray-200 text-gray-400`}
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => moveContentDown(idx)}
                            disabled={idx === contents.length - 1 || !!reorderingId || !!deletingId}
                            className={`${orderBtnBase} hover:bg-gray-200 text-gray-400`}
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-[#069494]/10 flex items-center justify-center flex-shrink-0">
                          <Icon size={16} className="text-[#069494]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                          <p className="text-xs text-gray-400">{CONTENT_TYPE_LABELS[item.type] ?? item.type} · #{item.display_order}</p>
                        </div>
                        <button
                          onClick={() => setContentModal(item)}
                          disabled={!!deletingId || !!reorderingId}
                          className="p-2 rounded-lg hover:bg-[#069494]/10 text-[#069494] transition-colors disabled:opacity-50"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteContent(item.id)}
                          disabled={deletingId === item.id || !!reorderingId}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Pre-test / Post-test tab ── */}
          {(tab === 'pre' || tab === 'post') && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700">
                  {tab === 'pre' ? 'Pre-test' : 'Post-test'} sualları
                </h2>
                <button
                  onClick={() => setQuestionModal({ testType: tab })}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#069494] text-white text-xs font-bold rounded-lg hover:bg-[#057a7a] transition-colors"
                >
                  <Plus size={14} /> Sual əlavə et
                </button>
              </div>

              {activeQs.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">Heç bir element yoxdur</p>
                  <button
                    onClick={() => setQuestionModal({ testType: tab })}
                    className="mt-3 text-sm text-[#069494] font-semibold hover:underline"
                  >
                    + İlk sualı əlavə et
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeQs.map((q, i) => (
                    <div key={q.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-start gap-2">
                        {/* Order buttons */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
                          <button
                            onClick={() => moveQuestionUp(i)}
                            disabled={i === 0 || !!reorderingId || !!deletingId}
                            className={`${orderBtnBase} hover:bg-gray-200 text-gray-400`}
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            onClick={() => moveQuestionDown(i)}
                            disabled={i === activeQs.length - 1 || !!reorderingId || !!deletingId}
                            className={`${orderBtnBase} hover:bg-gray-200 text-gray-400`}
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                        <span className="text-xs font-bold text-[#069494] bg-[#069494]/10 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{q.text}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(q.options || []).map((opt, j) => (
                              <span
                                key={j}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  opt.is_correct
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {opt.text}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => setQuestionModal({ testType: tab, item: q })}
                          disabled={!!deletingId || !!reorderingId}
                          className="p-2 rounded-lg hover:bg-[#069494]/10 text-[#069494] transition-colors flex-shrink-0 disabled:opacity-50"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          disabled={deletingId === q.id || !!reorderingId}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50 flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {contentModal !== null && (
        <ContentItemForm
          item={contentModal?.id ? contentModal : undefined}
          moduleId={moduleId}
          onSaved={handleContentSaved}
          onCancel={() => setContentModal(null)}
        />
      )}

      {questionModal !== null && (
        <QuestionForm
          item={questionModal.item}
          testId={questionModal.testType === 'pre' ? preTest?.id : postTest?.id}
          moduleId={moduleId}
          testType={questionModal.testType}
          onSaved={handleQuestionSaved}
          onTestCreated={handleTestCreated}
          onCancel={() => setQuestionModal(null)}
        />
      )}
    </div>
  );
}
