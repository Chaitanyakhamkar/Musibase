/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const PlayerContext = createContext();

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const audio = audioRef.current;
    
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.pause();
    };
  }, []);

  const playTrack = (track) => {
    const isSameTrack = 
      (currentTrack?.trackId && track.trackId && currentTrack.trackId === track.trackId) ||
      (currentTrack?.track_id && track.track_id && currentTrack.track_id === track.track_id) ||
      (currentTrack?.trackId && track.track_id && currentTrack.trackId === track.track_id) ||
      (currentTrack?.track_id && track.trackId && currentTrack.track_id === track.trackId);

    if (isSameTrack) {
      togglePlay();
      return;
    }
    
    setCurrentTrack(track);
    setProgress(0);
    const previewUrl = track.previewUrl || track.preview_url;
    
    if (previewUrl) {
      audioRef.current.src = previewUrl;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Playback error:", e));
    } else {
      console.warn("No preview URL available for this track");
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current.src) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Playback error:", e));
      }
    }
  };

  const seek = (percentage) => {
    if (audioRef.current.duration) {
      const time = (percentage / 100) * audioRef.current.duration;
      audioRef.current.currentTime = time;
      setProgress(percentage);
    }
  };

  return (
    <PlayerContext.Provider value={{ currentTrack, isPlaying, progress, playTrack, togglePlay, seek }}>
      {children}
    </PlayerContext.Provider>
  );
};
