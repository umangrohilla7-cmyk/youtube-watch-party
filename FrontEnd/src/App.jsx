import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import YouTube from 'react-youtube';

const BACKEND_URL = 'https://youtube-watch-party-b51f.onrender.com';

export default function App() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [socket, setSocket] = useState(null);
  
  const [participants, setParticipants] = useState({});
  const [myRole, setMyRole] = useState('Participant');
  const [videoId, setVideoId] = useState('dQw4w9WgXcQ');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const playerRef = useRef(null);
  const isUpdatingFromSocket = useRef(false);

  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('user_joined', ({ participants, role, userId }) => {
      setParticipants(participants);
      if (userId === socket.id) setMyRole(role);
    });

    socket.on('user_left', ({ participants }) => {
      setParticipants(participants);
    });

    socket.on('sync_state', (state) => {
      if (state && state.videoId) {
        setVideoId(state.videoId);
      }
    });

    socket.on('play', () => {
      if (playerRef.current) {
        isUpdatingFromSocket.current = true;
        playerRef.current.internalPlayer.playVideo();
      }
    });

    socket.on('pause', () => {
      if (playerRef.current) {
        isUpdatingFromSocket.current = true;
        playerRef.current.internalPlayer.pauseVideo();
      }
    });

    socket.on('seek', ({ time }) => {
      if (playerRef.current) {
        isUpdatingFromSocket.current = true;
        playerRef.current.internalPlayer.seekTo(time, true);
      }
    });

    socket.on('change_video', ({ videoId }) => {
      setVideoId(videoId);
    });

    socket.on('role_assigned', ({ participants, userId, role }) => {
      setParticipants(participants);
      if (userId === socket.id) setMyRole(role);
    });

    socket.on('participant_removed', (data) => {
      if (!data || data.userId === socket.id) {
        alert('You have been removed from the room.');
        window.location.reload();
      } else {
        setParticipants(data.participants);
      }
    });
  }, [socket]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomId || !username) return;
    socket.emit('join_room', { roomId, username });
    setJoined(true);
  };

  const extractVideoId = (url) => {
    if (!url) return '';
    url = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : url;
  };

  const handleVideoChange = (e) => {
    e.preventDefault();
    const extractedId = extractVideoId(newVideoUrl);
    if (extractedId) {
      socket.emit('change_video', { roomId, videoId: extractedId });
      setNewVideoUrl('');
    }
  };

  const handlePlay = () => {
    if (isUpdatingFromSocket.current) {
      isUpdatingFromSocket.current = false;
      return;
    }
    if (['Host', 'Moderator'].includes(myRole)) {
      socket.emit('play', { roomId });
    }
  };

  const handlePause = () => {
    if (isUpdatingFromSocket.current) {
      isUpdatingFromSocket.current = false;
      return;
    }
    if (['Host', 'Moderator'].includes(myRole)) {
      socket.emit('pause', { roomId });
    }
  };

  const handleStateChange = (event) => {
    if (event.data === 1) handlePlay();
    if (event.data === 2) handlePause();
  };

  const promoteUser = (targetUserId, role) => {
    socket.emit('assign_role', { roomId, targetUserId, role });
  };

  const removeUser = (targetUserId) => {
    socket.emit('remove_participant', { roomId, targetUserId });
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!joined) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Neon Ambient Background Orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] pointer-events-none" />
        
        {/* Join Room Glass Card */}
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-8 rounded-3xl shadow-2xl relative z-10 hover:border-slate-700/80 transition-all duration-300">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21.582 6.186a2.506 2.506 0 00-1.762-1.766C18.265 4 12 4 12 4s-6.264 0-7.82.42c-.868.232-1.547.91-1.78 1.766C2 7.749 2 12 2 12s0 4.251.4 5.814c.233.856.912 1.534 1.78 1.766C5.736 20 12 20 12 20s6.265 0 7.822-.42a2.506 2.506 0 001.762-1.766C22 16.251 22 12 22 12s0-4.251-.418-5.814zM9.999 15.499V8.501L15.999 12l-6 3.499z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Watch Party
            </h1>
            <p className="text-slate-400 text-sm mt-1">Sync, watch & hang out together</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Display Name</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder-slate-600 text-sm transition-all"
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Room Identifier</label>
              <input 
                type="text" 
                value={roomId} 
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="e.g. movie-night"
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 placeholder-slate-600 text-sm transition-all"
                required 
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/50 transition-all duration-200 text-sm mt-2 active:scale-[0.99]"
            >
              Enter Watch Party
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col font-sans">
      {/* Top Navbar Header */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21.582 6.186a2.506 2.506 0 00-1.762-1.766C18.265 4 12 4 12 4s-6.264 0-7.82.42c-.868.232-1.547.91-1.78 1.766C2 7.749 2 12 2 12s0 4.251.4 5.814c.233.856.912 1.534 1.78 1.766C5.736 20 12 20 12 20s6.265 0 7.822-.42a2.506 2.506 0 001.762-1.766C22 16.251 22 12 22 12s0-4.251-.418-5.814zM9.999 15.499V8.501L15.999 12l-6 3.499z" />
            </svg>
          </div>
          <span className="font-bold text-base bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Watch Party</span>
        </div>

        {/* Room Code Info */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400">Room:</span>
            <span className="font-mono font-semibold text-indigo-400">{roomId}</span>
            <button 
              onClick={copyRoomId} 
              className="ml-1 text-slate-500 hover:text-slate-200 transition-colors"
              title="Copy Room ID"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row p-6 gap-6 max-w-[1600px] w-full mx-auto">
        {/* Left Column: Player & Controls */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Video Player Card */}
          <div className="relative w-full aspect-video bg-slate-900/80 backdrop-blur-md rounded-2xl overflow-hidden border border-slate-800 shadow-2xl shadow-indigo-950/20 group">
            <YouTube
              key={videoId}
              videoId={videoId}
              ref={playerRef}
              opts={{
                width: '100%',
                height: '100%',
                playerVars: {
                  autoplay: 1,
                  controls: ['Host', 'Moderator'].includes(myRole) ? 1 : 0,
                },
              }}
              onStateChange={handleStateChange}
              className="w-full h-full absolute inset-0"
            />
          </div>

          {/* Controls Bar Card */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-semibold text-sm">
                {username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">{username}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  Role: 
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                    myRole === 'Host' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                    myRole === 'Moderator' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' :
                    'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {myRole}
                  </span>
                </p>
              </div>
            </div>

            {/* Change Video Input */}
            {['Host', 'Moderator'].includes(myRole) ? (
              <form onSubmit={handleVideoChange} className="flex gap-2 w-full md:w-auto flex-1 max-w-lg">
                <input 
                  type="text" 
                  placeholder="Paste YouTube video URL here..." 
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-slate-200 placeholder-slate-600"
                />
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                >
                  Load Video
                </button>
              </form>
            ) : (
              <div className="text-xs bg-slate-950/60 border border-slate-800 px-4 py-2 rounded-xl text-slate-500 italic">
                Only Host or Moderators can change videos
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Participants List */}
        <aside className="w-full lg:w-80 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex flex-col h-[500px] lg:h-auto">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span>Participants</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-mono">
                {Object.keys(participants).length}
              </span>
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {Object.entries(participants).map(([id, p]) => (
              <div 
                key={id} 
                className={`p-3.5 rounded-xl border transition-all ${
                  id === socket.id 
                    ? 'bg-indigo-950/30 border-indigo-800/50' 
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium text-slate-300">
                      {p.username ? p.username.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-200 flex items-center gap-1">
                        {p.username}
                        {id === socket.id && <span className="text-[10px] text-indigo-400 font-normal">(You)</span>}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                    p.role === 'Host' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    p.role === 'Moderator' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {p.role}
                  </span>
                </div>

                {/* Host Control Actions */}
                {myRole === 'Host' && id !== socket.id && (
                  <div className="flex gap-2 mt-3 pt-2.5 border-t border-slate-800/60">
                    {p.role !== 'Moderator' ? (
                      <button 
                        onClick={() => promoteUser(id, 'Moderator')} 
                        className="flex-1 py-1 px-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-medium transition-colors"
                      >
                        Make Mod
                      </button>
                    ) : (
                      <button 
                        onClick={() => promoteUser(id, 'Participant')} 
                        className="flex-1 py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-medium transition-colors"
                      >
                        Demote
                      </button>
                    )}
                    <button 
                      onClick={() => removeUser(id)} 
                      className="py-1 px-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-[10px] font-medium transition-colors"
                    >
                      Kick
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}