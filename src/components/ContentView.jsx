import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Lock } from 'lucide-react';

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

function YouTubePlayer({ videoId, contentId, userId, isWatched, onWatched }) {
  const divRef = useRef(null);
  const playerRef = useRef(null);
  const watchedRef = useRef(isWatched);

  useEffect(() => { watchedRef.current = isWatched; }, [isWatched]);

  useEffect(() => {
    let interval = null;

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
            // State 1 = playing → poll every 5s
            if (e.data === 1) {
              interval = setInterval(() => {
                if (!playerRef.current || watchedRef.current) {
                  clearInterval(interval);
                  return;
                }
                try {
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

function StorageVideo({ src, contentId, userId, isWatched, onWatched }) {
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
        controls
        className="w-full aspect-video rounded-2xl bg-black"
        onTimeUpdate={(e) => {
          if (isWatched) return;
          const { currentTime, duration } = e.target;
          if (duration > 0 && currentTime / duration >= 0.9) markWatched();
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

export default function ContentView({ contents, userId, onAllComplete }) {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

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
        setProgress(map);
        setLoading(false);
        checkAllDone(map);
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
    await supabase.from('content_progress').upsert(
      { user_id: userId, content_id: contentId, completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'user_id,content_id' }
    );
    handleDone(contentId);
  };

  const checkAllDone = (map) => {
    if (contents.every(c => map[c.id])) onAllComplete();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-gray-400 text-sm">Yüklənir...</p>
    </div>
  );

  const completedCount = contents.filter(c => progress[c.id]).length;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Progress bar */}
      <div className="bg-white rounded-2xl border-2 border-[#069494]/20 p-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-600">
          {completedCount} / {contents.length} material tamamlandı
        </p>
        {completedCount === contents.length && (
          <span className="text-sm font-bold text-green-600 flex items-center gap-1">
            <CheckCircle2 size={16} /> Hamısı tamamlandı
          </span>
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
                    isWatched={done}
                    onWatched={handleDone}
                  />
                ) : item.type === 'video' ? (
                  <YouTubePlayer
                    videoId={item.body}
                    contentId={item.id}
                    userId={userId}
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
    </div>
  );
}
