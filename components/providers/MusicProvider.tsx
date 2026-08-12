'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface Station {
  id: string;
  name: string;
  author: string;
  thumbnail: string;
}

const INITIAL_STATIONS: Station[] = [
  {
    id: 'zFhfksj_mco',
    name: 'Ambient Loop Music',
    author: 'Focus Radio',
    thumbnail: 'https://img.youtube.com/vi/zFhfksj_mco/0.jpg',
  },
];

interface MusicContextType {
  currentStation: Station;
  isPlaying: boolean;
  isRepeating: boolean;
  isSearching: boolean;
  currentTime: number;
  duration: number;
  togglePlay: () => void;
  toggleRepeat: () => void;
  nextStation: () => void;
  prevStation: () => void;
  searchSong: (query: string) => Promise<void>;
  seek: (time: number) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [currentStation, setCurrentStation] = useState<Station>(INITIAL_STATIONS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const playerRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const isRepeatingRef = useRef(isRepeating);

  // Sync ref with state
  useEffect(() => {
    isRepeatingRef.current = isRepeating;
  }, [isRepeating]);

  const togglePlay = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const toggleRepeat = () => setIsRepeating(!isRepeating);

  const nextStation = () => {
    const index = INITIAL_STATIONS.findIndex(s => s.id === currentStation.id);
    const nextIndex = index !== -1 ? (index + 1) % INITIAL_STATIONS.length : 0;
    setCurrentStation(INITIAL_STATIONS[nextIndex]);
    setIsPlaying(true);
  };

  const prevStation = () => {
    const index = INITIAL_STATIONS.findIndex(s => s.id === currentStation.id);
    const prevIndex = index !== -1 ? (index - 1 + INITIAL_STATIONS.length) % INITIAL_STATIONS.length : 0;
    setCurrentStation(INITIAL_STATIONS[prevIndex]);
    setIsPlaying(true);
  };

  const seek = (time: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time, true);
      setCurrentTime(time);
    }
  };

  const searchSong = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/music/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.id) {
        setCurrentStation(data);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    // Load YouTube IFrame API
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    (window as any).onYouTubeIframeAPIReady = () => {
      console.log('YT API Ready');
      initializePlayer(currentStation.id);
    };

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (playerRef.current && playerRef.current.loadVideoById) {
      playerRef.current.loadVideoById(currentStation.id);
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } else if ((window as any).YT && (window as any).YT.Player) {
      initializePlayer(currentStation.id);
    }
  }, [currentStation.id]);

  const initializePlayer = (videoId: string) => {
    playerRef.current = new (window as any).YT.Player('yt-player-hidden', {
      height: '1',
      width: '1',
      videoId: videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        showinfo: 0,
        rel: 0,
        enablejsapi: 1,
      },
      events: {
        onReady: (event: any) => {
          if (isPlaying) event.target.playVideo();
          startTimer();
        },
        onStateChange: (event: any) => {
          // YT.PlayerState.ENDED = 0
          if (event.data === 0) {
            if (isRepeatingRef.current) {
              event.target.seekTo(0);
              event.target.playVideo();
            } else {
              // Fallback to Ambient Loop Music
              const fallback = INITIAL_STATIONS[0];
              setCurrentStation(fallback);
              setIsPlaying(true);
              if (event.target.loadVideoById) {
                event.target.loadVideoById(fallback.id);
              }
            }
          }
          // YT.PlayerState.PLAYING = 1
          if (event.data === 1) {
            setIsPlaying(true);
            setDuration(event.target.getDuration());
          }
          // YT.PlayerState.PAUSED = 2
          if (event.data === 2) {
            setIsPlaying(false);
          }
        },
      },
    });
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 1000);
  };

  return (
    <MusicContext.Provider value={{ 
      currentStation, 
      isPlaying, 
      isRepeating,
      isSearching,
      currentTime,
      duration,
      togglePlay, 
      toggleRepeat,
      nextStation, 
      prevStation, 
      searchSong,
      seek
    }}>
      {children}
      
      {/* Persistent Audio Engine */}
      <div className="fixed -bottom-10 -right-10 opacity-0 pointer-events-none overflow-hidden w-0 h-0">
        <div id="yt-player-hidden"></div>
      </div>
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
