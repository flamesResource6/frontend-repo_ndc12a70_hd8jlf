import React, { useEffect, useMemo, useRef, useState } from 'react';
import Spline from '@splinetool/react-spline';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

function SearchBar({ onSearch }) {
  const [q, setQ] = useState('');
  return (
    <div className="w-full flex items-center gap-2">
      <input
        value={q}
        onChange={(e)=>setQ(e.target.value)}
        onKeyDown={(e)=>{ if(e.key==='Enter') onSearch(q) }}
        placeholder="Search tracks (Jamendo, SoundCloud, Audiomack, Internet Archive)"
        className="w-full rounded-md border border-gray-300 bg-white/70 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button onClick={()=>onSearch(q)} className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">Search</button>
    </div>
  );
}

function TrackCard({ track }) {
  const best = track.best_source_index != null ? track.sources[track.best_source_index] : null;
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  useEffect(()=>{
    if(!best) return;
    // Use backend proxy to avoid exposing any keys
    const url = new URL(`${API_BASE}/stream`);
    url.searchParams.set('url', best.stream_url || best.download_url || '');
    url.searchParams.set('provider', best.provider_name);
    fetch(url).then(r=>r.json()).then(d=>{
      setAudioUrl(d.proxied_url);
    }).catch(()=>setAudioUrl(null));
  }, [best]);

  return (
    <div className="rounded-xl bg-white/70 backdrop-blur p-4 shadow-sm border border-gray-200">
      <div className="flex gap-4">
        {track.cover_url ? (
          <img src={track.cover_url} alt="cover" className="h-16 w-16 rounded object-cover" />
        ) : (
          <div className="h-16 w-16 rounded bg-gray-200" />
        )}
        <div className="flex-1">
          <div className="font-semibold text-gray-900">{track.title}</div>
          <div className="text-sm text-gray-600">{track.artist || 'Unknown artist'}</div>
          {best && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-green-100 text-green-700 px-2 py-1">Source: {best.provider_name}</span>
              {best.license && (
                <span className="rounded bg-blue-100 text-blue-700 px-2 py-1">License: {best.license}</span>
              )}
              {best.audiodownload_allowed || best.downloadable ? (
                <span className="rounded bg-emerald-100 text-emerald-700 px-2 py-1">Download allowed</span>
              ) : null}
            </div>
          )}
          {audioUrl ? (
            <audio ref={audioRef} controls className="mt-3 w-full">
              <source src={audioUrl} type="audio/mpeg" />
            </audio>
          ) : (
            <div className="mt-3 text-sm text-amber-700 bg-amber-50 rounded px-2 py-1">No full stream available; showing metadata only.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allowMetaOnly, setAllowMetaOnly] = useState(false);

  const onSearch = async (q)=>{
    if(!q || q.trim().length<2) return;
    setLoading(true);
    try{
      const url = new URL(`${API_BASE}/search`);
      url.searchParams.set('q', q);
      url.searchParams.set('allow_metadata_only', allowMetaOnly ? 'true':'false');
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.results || []);
    }catch(e){
      setResults([]);
    }finally{
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-indigo-50 via-white to-white">
      <div className="relative h-[280px] w-full">
        <Spline scene="https://prod.spline.design/LU2mWMPbF3Qi1Qxh/scene.splinecode" style={{ width: '100%', height: '100%' }} />
        <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/20 to-white pointer-events-none" />
        <div className="absolute inset-0 flex items-end justify-center pb-6">
          <div className="max-w-4xl w-full px-4">
            <h1 className="text-3xl font-bold text-gray-900">Full-Track Music Player</h1>
            <p className="text-gray-600 mt-1">Aggregates only full, legally streamable sources. Previews are never auto-played.</p>
            <div className="mt-4">
              <SearchBar onSearch={onSearch} />
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={allowMetaOnly} onChange={(e)=>setAllowMetaOnly(e.target.checked)} />
                Allow metadata-only playback (previews) — off by default
              </label>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading && <div className="text-gray-600">Searching…</div>}
        {!loading && results.length===0 && <div className="text-gray-500">Search for music from Jamendo, SoundCloud, Audiomack, and Internet Archive.</div>}
        <div className="mt-4 grid gap-4">
          {results.map((t,i)=>(<TrackCard key={i} track={t} />))}
        </div>
      </div>
    </div>
  );
}
