import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, XCircle } from 'lucide-react';

function ResultView({ result, questions, testType, onContinue, onRetry }) {
  const { score_percent, passed, correct_count, total_questions, feedback, attempts_remaining_today } = result;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className={`rounded-3xl p-8 mb-8 text-center border-2 ${
        passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className={`text-6xl font-black mb-2 ${passed ? 'text-green-600' : 'text-red-500'}`}>
          {score_percent}%
        </div>
        <p className={`text-lg font-bold mb-1 ${passed ? 'text-green-700' : 'text-red-600'}`}>
          {passed ? 'Keçdiniz!' : 'Keçmədiniz'}
        </p>
        <p className="text-sm text-gray-500">{correct_count} / {total_questions} düzgün cavab</p>
        {!passed && attempts_remaining_today > 0 && (
          <p className="text-sm text-orange-500 mt-2">Bu gün {attempts_remaining_today} cəhd qalır</p>
        )}
        {!passed && attempts_remaining_today === 0 && (
          <p className="text-sm text-red-500 mt-2">Bu gün cəhd limiti dolub. Sabah yenidən cəhd edin.</p>
        )}
      </div>

      <div className="space-y-3 mb-8">
        {feedback.map((fb) => {
          const q = questions.find(q => q.id === fb.question_id);
          return (
            <div key={fb.question_id} className={`rounded-xl p-4 border ${
              fb.is_correct ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
            }`}>
              <div className="flex items-start gap-3">
                {fb.is_correct
                  ? <CheckCircle2 size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                  : <XCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
                }
                <div>
                  <p className="text-sm font-semibold text-gray-800">{q?.text}</p>
                  {!fb.is_correct && fb.correct_answer && (
                    <p className="text-xs text-green-700 mt-1">
                      Düzgün cavab: <strong>{fb.correct_answer}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        {passed ? (
          <button
            onClick={onContinue}
            className="flex-1 py-3 bg-[#069494] text-white font-bold rounded-2xl hover:bg-[#057a7a] transition-all shadow-lg shadow-[#069494]/20"
          >
            {testType === 'pre' ? 'Materiallara keç →' : 'Tamamlandı →'}
          </button>
        ) : (
          attempts_remaining_today > 0 && (
            <button
              onClick={onRetry}
              className="flex-1 py-3 bg-gray-800 text-white font-bold rounded-2xl hover:bg-gray-700 transition-all"
            >
              Yenidən cəhd et
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default function TestView({ testId, testType, onComplete }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('questions')
      .select('id, text, options, display_order')
      .eq('test_id', testId)
      .order('display_order')
      .then(({ data }) => { setQuestions(data || []); setLoading(false); });
  }, [testId]);

  const handleSelect = (questionId, choice) =>
    setAnswers(prev => ({ ...prev, [questionId]: choice }));

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      setError('Bütün sualları cavablandırın.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('submit-test', {
        body: {
          test_id: testId,
          answers: Object.entries(answers).map(([qId, choice]) => ({
            question_id: parseInt(qId),
            user_choice: choice,
          })),
        },
      });
      if (fnError) throw new Error(fnError.message || 'Xəta baş verdi');
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-gray-400 text-sm">Yüklənir...</p>
    </div>
  );

  if (result) return (
    <ResultView
      result={result}
      questions={questions}
      testType={testType}
      onContinue={() => onComplete(result)}
      onRetry={() => { setResult(null); setAnswers({}); }}
    />
  );

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="space-y-6">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-white rounded-2xl border-2 border-gray-100 p-6">
            <p className="font-semibold text-gray-800 mb-4">
              <span className="text-[#069494] mr-2">{i + 1}.</span>{q.text}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, j) => (
                <button
                  key={j}
                  onClick={() => handleSelect(q.id, opt.text)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    answers[q.id] === opt.text
                      ? 'border-[#069494] bg-[#069494]/5 text-[#069494]'
                      : 'border-gray-100 hover:border-[#069494]/30 text-gray-700'
                  }`}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-gray-400">{answeredCount} / {questions.length} cavablandı</p>
        <button
          onClick={handleSubmit}
          disabled={submitting || answeredCount < questions.length}
          className="px-8 py-3 bg-[#069494] hover:bg-[#057a7a] disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#069494]/20"
        >
          {submitting ? 'Göndərilir...' : 'Təsdiq et'}
        </button>
      </div>
    </div>
  );
}
