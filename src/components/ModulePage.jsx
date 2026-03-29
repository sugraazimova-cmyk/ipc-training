import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TestView from './TestView';
import ContentView from './ContentView';
import { ArrowLeft, CheckCircle2, Lock, ChevronRight } from 'lucide-react';

export default function ModulePage({ user }) {
  const { moduleId } = useParams();
  const navigate = useNavigate();

  const [module, setModule]           = useState(null);
  const [preTest, setPreTest]         = useState(null);
  const [postTest, setPostTest]       = useState(null);
  const [contents, setContents]       = useState([]);
  const [progress, setProgress]       = useState(null);
  const [allContentDone, setAllContentDone] = useState(false);
  const [step, setStep]               = useState('pretest');
  const [loading, setLoading]         = useState(true);

  useEffect(() => { fetchAll(); }, [moduleId]);

  const fetchAll = async () => {
    setLoading(true);

    const [modRes, testsRes, contentRes, progRes] = await Promise.all([
      supabase.from('modules').select('*').eq('id', moduleId).single(),
      supabase.from('tests').select('*').eq('module_id', moduleId),
      supabase.from('content').select('*').eq('module_id', moduleId).order('display_order'),
      supabase.from('user_progress').select('*').eq('user_id', user.id).eq('module_id', moduleId).maybeSingle(),
    ]);

    const mod      = modRes.data;
    const tests    = testsRes.data || [];
    const items    = contentRes.data || [];
    const prog     = progRes.data;

    setModule(mod);
    setPreTest(tests.find(t => t.type === 'pre') || null);
    setPostTest(tests.find(t => t.type === 'post') || null);
    setContents(items);
    setProgress(prog);

    // Check content completion
    let contentAllDone = false;
    if (items.length) {
      const { data: cp } = await supabase
        .from('content_progress')
        .select('content_id, completed')
        .eq('user_id', user.id)
        .in('content_id', items.map(c => c.id));

      contentAllDone = items.every(c => cp?.find(p => p.content_id === c.id)?.completed === true);
      setAllContentDone(contentAllDone);
    }

    // Check if pre-test was actually attempted (source of truth — status may be stale)
    const preTestRow = tests.find(t => t.type === 'pre');
    let preAttempted = false;
    if (preTestRow) {
      const { count } = await supabase
        .from('test_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('test_id', preTestRow.id);
      preAttempted = (count ?? 0) > 0;
    }

    // Determine step — use preAttempted as fallback if status is stale
    if (prog?.status === 'completed') {
      setStep('done');
    } else if (prog?.status === 'in_progress' || preAttempted) {
      setStep(contentAllDone ? 'posttest' : 'content');
    } else {
      setStep('pretest');
    }

    setLoading(false);
  };

  const handlePreTestComplete = () => {
    setProgress(p => ({ ...(p || {}), status: 'in_progress' }));
    setStep('content');
  };

  const handleAllContentComplete = () => {
    setAllContentDone(true);
    setStep('posttest');
  };

  const handlePostTestComplete = (result) => {
    if (result.passed) {
      setProgress(p => ({ ...(p || {}), status: 'completed' }));
      setStep('done');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Yüklənir...</p>
    </div>
  );

  const prePassed  = (progress && progress.status !== 'not_started') || step !== 'pretest';
  const postPassed = progress?.status === 'completed';

  const steps = [
    { key: 'pretest',  label: 'Pre-test',    done: prePassed },
    { key: 'content',  label: 'Materiallar', done: allContentDone },
    { key: 'posttest', label: 'Post-test',   done: postPassed },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="font-bold text-gray-800 text-base leading-tight">{module?.title}</h1>
        </div>

        {/* Step indicator */}
        <div className="max-w-4xl mx-auto px-6 pb-4 flex items-center gap-2">
          {steps.map((s, i) => {
            const isActive = step === s.key;
            const isLocked =
              (s.key === 'content'  && !prePassed) ||
              (s.key === 'posttest' && !allContentDone);
            const isClickable = !isLocked;

            return (
              <div key={s.key} className="flex items-center gap-2">
                <button
                  disabled={!isClickable}
                  onClick={() => isClickable && setStep(s.key)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    s.done
                      ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer'
                      : isActive
                      ? 'bg-[#069494] text-white'
                      : isLocked
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer'
                  }`}
                >
                  {s.done        ? <CheckCircle2 size={12} /> : null}
                  {!s.done && isLocked ? <Lock size={12} /> : null}
                  {s.label}
                </button>
                {i < steps.length - 1 && (
                  <ChevronRight size={14} className="text-gray-300" />
                )}
              </div>
            );
          })}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        {step === 'pretest' && preTest && (
          <TestView testId={preTest.id} testType="pre" onComplete={handlePreTestComplete} />
        )}

        {step === 'content' && (
          <ContentView
            contents={contents}
            userId={user.id}
            moduleId={moduleId}
            onAllComplete={handleAllContentComplete}
          />
        )}

        {step === 'posttest' && postTest && (
          <TestView testId={postTest.id} testType="post" onComplete={handlePostTestComplete} />
        )}

        {step === 'done' && (
          <div className="py-20 px-4 text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Təbrik edirik!</h2>
            <p className="text-gray-500 mb-2">Modulu uğurla tamamladınız.</p>
            <p className="text-sm text-[#069494] font-semibold mb-10">Sertifikatınız verildi.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 bg-[#069494] text-white font-bold rounded-2xl hover:bg-[#057a7a] transition-all shadow-lg shadow-[#069494]/20"
            >
              Dashboarda qayıt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
