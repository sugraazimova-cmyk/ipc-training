import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Lock, ChevronDown, ChevronUp, PlayCircle, FileText, AlignLeft } from 'lucide-react';

// Global YouTube API loader — handles multiple players and re-renders safely
const ytCallbacks = [];
let ytLoading = false;

function loadYTApi(cb) {
  if (window.YT?.Player) { cb(); return; }
  ytCallbacks.push(cb);
  if (!ytLoading) {
    ytLoading = true;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      ytCallbacks.forEach(fn => fn());
      ytCallbacks.length = 0;
    };
  }
}

function YouTubePlayer({ videoId, contentId, userId, moduleId, isWatched, onWatched }) {
  const divRef = useRef(null);
  const playerRef = useRef(null);
  const watchedRef = useRef(isWatched);
  const maxReachedRef = useRef(0);
  const accessUpdatedRef = useRef(false);

  useEffect(() => { watchedRef.current = isWatched; }, [isWatched]);

  useEffect(() => {
    let interval = null;

    const enforceNoSkip = () => {
      if (watchedRef.current || !playerRef.current) return;
      try {
        const current = playerRef.current.getCurrentTime();
        // Allow up to 10s ahead of max reached (buffer for seek imprecision)
        if (current > maxReachedRef.current + 10) {
          playerRef.current.seekTo(maxReachedRef.current, true);
        } else {
          maxReachedRef.current = Math.max(maxReachedRef.current, current);
        }
      } catch {}
    };

    const init = () => {
      if (!divRef.current) return;
      playerRef.current = new window.YT.Player(divRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onStateChange: (e) => {
            // State 0 = ended → definitely watched
            if (e.data === 0) {
              markWatched();
              return;
            }
            // State 1 = playing → check for skip, then poll every 5s
            if (e.data === 1) {
              enforceNoSkip();
              interval = setInterval(() => {
                if (!playerRef.current || watchedRef.current) {
                  clearInterval(interval);
                  return;
                }
                try {
                  enforceNoSkip();
                  // After 10s of real playback, mark meaningful content access
                  if (!accessUpdatedRef.current && maxReachedRef.current >= 10) {
                    accessUpdatedRef.current = true;
                    supabase.from('user_progress').upsert(
                      { user_id: userId, module_id: parseInt(moduleId), last_content_access_at: new Date().toISOString() },
                      { onConflict: 'user_id,module_id' }
                    );
                  }
                  const pct = playerRef.current.getCurrentTime() / playerRef.current.getDuration();
                  if (pct >= 0.9) { markWatched(); clearInterval(interval); }
                } catch {}
              }, 5000);
            } else {
              clearInterval(interval);
            }
          },
        },
      });
    };

    const markWatched = async () => {
      if (watchedRef.current) return;
      watchedRef.current = true;
      await supabase.from('content_progress').upsert(
        { user_id: userId, content_id: contentId, completed: true, watch_pct: 90, completed_at: new Date().toISOString() },
        { onConflict: 'user_id,content_id' }
      );
      onWatched(contentId);
    };

    loadYTApi(init);

    return () => {
      clearInterval(interval);
      playerRef.current?.destroy?.();
    };
  }, [videoId]);

  return (
    <div className="relative">
      <div ref={divRef} className="w-full aspect-video rounded-2xl overflow-hidden bg-black" />
      {isWatched && (
        <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <CheckCircle2 size={12} /> İzlənildi
        </div>
      )}
    </div>
  );
}

function StorageVideo({ src, contentId, userId, moduleId, isWatched, onWatched }) {
  const videoRef = useRef(null);
  const maxWatchedRef = useRef(0);
  const accessUpdatedRef = useRef(false);

  const markWatched = async () => {
    if (isWatched) return;
    await supabase.from('content_progress').upsert(
      { user_id: userId, content_id: contentId, completed: true, watch_pct: 90, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,content_id' }
    );
    onWatched(contentId);
  };

  return (
    <div className="relative">
      <video
        ref={videoRef}
        controls
        className="w-full aspect-video rounded-2xl bg-black"
        onTimeUpdate={(e) => {
          if (isWatched) return;
          const { currentTime, duration } = e.target;
          maxWatchedRef.current = Math.max(maxWatchedRef.current, currentTime);
          // After 10s of real playback, mark meaningful content access
          if (!accessUpdatedRef.current && maxWatchedRef.current >= 10) {
            accessUpdatedRef.current = true;
            supabase.from('user_progress').upsert(
              { user_id: userId, module_id: parseInt(moduleId), last_content_access_at: new Date().toISOString() },
              { onConflict: 'user_id,module_id' }
            );
          }
          if (duration > 0 && currentTime / duration >= 0.9) markWatched();
        }}
        onSeeking={(e) => {
          if (isWatched) return;
          if (e.target.currentTime > maxWatchedRef.current + 2) {
            e.target.currentTime = maxWatchedRef.current;
          }
        }}
      >
        <source src={src} />
      </video>
      {isWatched && (
        <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <CheckCircle2 size={12} /> İzlənildi
        </div>
      )}
    </div>
  );
}

const CONTENT_ICON = { video: PlayCircle, pdf: FileText };

export default function ContentView({ contents, userId, moduleId, onAllComplete }) {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const initiallyAllDoneRef = useRef(false);

  useEffect(() => {
    if (!contents.length) { setLoading(false); return; }
    supabase
      .from('content_progress')
      .select('content_id, completed')
      .eq('user_id', userId)
      .in('content_id', contents.map(c => c.id))
      .then(({ data }) => {
        const map = {};
        (data || []).forEach(cp => { map[cp.content_id] = cp.completed; });
        const allDone = contents.every(c => map[c.id]);
        initiallyAllDoneRef.current = allDone;
        setProgress(map);
        setLoading(false);
        if (!allDone) checkAllDone(map);
      });
  }, []);

  const handleDone = (contentId) => {
    setProgress(prev => {
      const updated = { ...prev, [contentId]: true };
      checkAllDone(updated);
      return updated;
    });
  };

  const markRead = async (contentId) => {
    const now = new Date().toISOString();
    await Promise.all([
      supabase.from('content_progress').upsert(
        { user_id: userId, content_id: contentId, completed: true, completed_at: now },
        { onConflict: 'user_id,content_id' }
      ),
      supabase.from('user_progress').upsert(
        { user_id: userId, module_id: parseInt(moduleId), last_content_access_at: now },
        { onConflict: 'user_id,module_id' }
      ),
    ]);
    handleDone(contentId);
  };

  const checkAllDone = () => {
    // No auto-redirect — user clicks the CTA button intentionally
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-gray-400 text-sm">Yüklənir...</p>
    </div>
  );

  const completedCount = contents.filter(c => progress[c.id]).length;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Progress Panel */}
      <div className="bg-white rounded-2xl border-2 border-[#069494]/20 overflow-hidden">
        {/* Header row */}
        <button
          onClick={() => setPanelOpen(o => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-semibold text-gray-700">
              {completedCount} / {contents.length} material tamamlandı
            </span>
            {completedCount === contents.length && (
              <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                <CheckCircle2 size={13} /> Hamısı tamamlandı
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            {/* Mini progress bar */}
            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#069494] rounded-full transition-all duration-500"
                style={{ width: `${contents.length ? Math.round((completedCount / contents.length) * 100) : 0}%` }}
              />
            </div>
            {panelOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </button>

        {/* Expandable list */}
        {panelOpen && (
          <div className="border-t border-gray-100 divide-y divide-gray-50">
            {contents.map((item, idx) => {
              const done = !!progress[item.id];
              const locked = idx > 0 && !progress[contents[idx - 1].id];
              const Icon = CONTENT_ICON[item.type] || AlignLeft;
              return (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <Icon size={15} className={done ? 'text-green-500' : locked ? 'text-gray-300' : 'text-[#069494]'} />
                  <span className={`text-sm flex-1 truncate ${done ? 'text-gray-400 line-through' : locked ? 'text-gray-300' : 'text-gray-700 font-medium'}`}>
                    {item.title}
                  </span>
                  {done
                    ? <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                    : locked
                    ? <Lock size={13} className="text-gray-300 flex-shrink-0" />
                    : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {contents.map((item, idx) => {
        const done = !!progress[item.id];
        // Lock each item until previous is done
        const locked = idx > 0 && !progress[contents[idx - 1].id];

        return (
          <div key={item.id} className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
            done ? 'border-green-200' : locked ? 'border-gray-100 opacity-60' : 'border-gray-100'
          }`}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                {locked && <Lock size={14} className="text-gray-400" />}
                {item.title}
              </h3>
              {done && (
                <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Tamamlandı
                </span>
              )}
            </div>

            {!locked && (
              <div className="p-6">
                {item.type === 'video' && item.body.startsWith('http') ? (
                  <StorageVideo
                    src={item.body}
                    contentId={item.id}
                    userId={userId}
                    moduleId={moduleId}
                    isWatched={done}
                    onWatched={handleDone}
                  />
                ) : item.type === 'video' ? (
                  <YouTubePlayer
                    videoId={item.body}
                    contentId={item.id}
                    userId={userId}
                    moduleId={moduleId}
                    isWatched={done}
                    onWatched={handleDone}
                  />
                ) : item.type === 'pdf' ? (
                  <div>
                    <iframe src={item.body} className="w-full h-[600px] rounded-xl border border-gray-100" />
                    {!done && (
                      <button onClick={() => markRead(item.id)}
                        className="mt-4 px-6 py-2.5 bg-[#069494] text-white text-sm font-bold rounded-xl hover:bg-[#057a7a] transition-all">
                        Oxudum ✓
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="prose max-w-none text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: item.body }} />
                    {!done && (
                      <button onClick={() => markRead(item.id)}
                        className="mt-6 px-6 py-2.5 bg-[#069494] text-white text-sm font-bold rounded-xl hover:bg-[#057a7a] transition-all">
                        Oxudum ✓
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Post-test CTA — shown only when all content completed */}
      {completedCount === contents.length && contents.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-[#069494]/20 p-6 text-center">
          <p className="text-sm font-semibold text-gray-700 mb-4">Bütün materialları tamamladınız. Post-testə keçməyə hazırsınız.</p>
          <button
            onClick={onAllComplete}
            className="px-8 py-3 bg-[#069494] text-white font-bold rounded-2xl hover:bg-[#057a7a] transition-all shadow-lg shadow-[#069494]/20"
          >
            Post-testə keç →
          </button>
        </div>
      )}
    </div>
  );
}
