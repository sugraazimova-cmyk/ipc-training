import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Pencil, Trash2, Plus, Video, FileText, Code2 } from 'lucide-react';
import QuestionForm from './QuestionForm';
import ContentItemForm from './ContentItemForm';

const TABS = [
  { key: 'info',    label: 'Əsas məlumat' },
  { key: 'content', label: 'Məzmun' },
  { key: 'pre',     label: 'Pre-test' },
  { key: 'post',    label: 'Post-test' },
];

const CONTENT_TYPE_ICONS = { video: Video, pdf: FileText, html: Code2 };
const CONTENT_TYPE_LABELS = { video: 'Video', pdf: 'PDF', html: 'HTML' };

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

  // Info tab state
  const [infoForm, setInfoForm]     = useState(null);
  const [infoSaving, setInfoSaving] = useState(false);

  useEffect(() => { fetchAll(); }, [moduleId]);

  const fetchAll = async () => {
    setLoading(true);
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

  const saveInfo = async (e) => {
    e.preventDefault();
    setInfoSaving(true);
    const { error } = await supabase.from('modules').update(infoForm).eq('id', moduleId);
    if (!error) setModule(prev => ({ ...prev, ...infoForm }));
    else alert('Xəta baş verdi');
    setInfoSaving(false);
  };

  const handleDeleteContent = async (id) => {
    if (!confirm('Bu məzmunu silmək istədiyinizə əminsiniz?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('content').delete().eq('id', id);
    if (error) alert('Xəta baş verdi');
    else setContents(prev => prev.filter(c => c.id !== id));
    setDeletingId(null);
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm('Bu sualı silmək istədiyinizə əminsiniz?')) return;
    setDeletingId(id);
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) alert('Xəta baş verdi');
    else {
      if (tab === 'pre') setPreQs(prev => prev.filter(q => q.id !== id));
      else setPostQs(prev => prev.filter(q => q.id !== id));
    }
    setDeletingId(null);
  };

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

  const activeQs = tab === 'pre' ? preQs : postQs;

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
            <h1 className="text-xl font-bold text-gray-800">{module?.title}</h1>
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
                  onChange={e => setInfoForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Təsvir</label>
                <textarea
                  rows={3}
                  value={infoForm.description}
                  onChange={e => setInfoForm(p => ({ ...p, description: e.target.value }))}
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
                    onChange={e => setInfoForm(p => ({ ...p, pass_threshold: parseInt(e.target.value) }))}
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
                    onChange={e => setInfoForm(p => ({ ...p, certificate_validity_days: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#069494] transition-colors"
                  />
                </div>
              </div>
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
                  {contents.map(item => {
                    const Icon = CONTENT_TYPE_ICONS[item.type] ?? FileText;
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-8 h-8 rounded-lg bg-[#069494]/10 flex items-center justify-center flex-shrink-0">
                          <Icon size={16} className="text-[#069494]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                          <p className="text-xs text-gray-400">{CONTENT_TYPE_LABELS[item.type] ?? item.type} · #{item.display_order}</p>
                        </div>
                        <button
                          onClick={() => setContentModal(item)}
                          disabled={deletingId === item.id}
                          className="p-2 rounded-lg hover:bg-[#069494]/10 text-[#069494] transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteContent(item.id)}
                          disabled={deletingId === item.id}
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
                      <div className="flex items-start gap-3">
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
                          disabled={deletingId === q.id}
                          className="p-2 rounded-lg hover:bg-[#069494]/10 text-[#069494] transition-colors flex-shrink-0"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          disabled={deletingId === q.id}
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
