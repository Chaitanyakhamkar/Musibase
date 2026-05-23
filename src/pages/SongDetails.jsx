import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Disc, User, Calendar, Tag, PlayCircle, Pause, Globe, Languages, Loader, Edit2, Save, X, Heart, ListMusic } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { usePlayer } from '../PlayerContext';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import './SongDetails.css';

const SongDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  
  const [track, setTrack] = useState(location.state?.track || null);
  const [lyrics, setLyrics] = useState(null);
  const [loadingLyrics, setLoadingLyrics] = useState(true);
  const [loadingTrack, setLoadingTrack] = useState(!track);
  
  const [isLiked, setIsLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

  // Translation states
  const [translatedLyrics, setTranslatedLyrics] = useState(null);
  const [targetLang, setTargetLang] = useState('es');
  const [translating, setTranslating] = useState(false);
  const [detectedLang, setDetectedLang] = useState('Unknown');

  // Override States
  const [isEditingData, setIsEditingData] = useState(false);
  const [customData, setCustomData] = useState({ country: '', language: '', label: '' });
  const [wikiData, setWikiData] = useState(null);

  useEffect(() => {
    if (track) {
      const savedOverride = localStorage.getItem(`track-override-${track.trackId}`);
      if (savedOverride) {
        setCustomData(JSON.parse(savedOverride));
      }
    }
  }, [track]);

  useEffect(() => {
    const fetchWiki = async () => {
      if (!track) return;
      try {
        const checkWiki = async (lang) => {
          let res = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(track.artistName)}&utf8=&format=json&origin=*`);
          let data = await res.json();
          if (data.query?.search?.length > 0) {
            const pageId = data.query.search[0].pageid;
            const pageRes = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&pageids=${pageId}&format=json&origin=*`);
            const pageData = await pageRes.json();
            return pageData.query.pages[pageId].extract;
          }
          return null;
        };

        let extract = await checkWiki('en');
        if (!extract) extract = await checkWiki('hi');
        
        if (extract) {
          let foundCountry = '';
          let foundLang = '';
          
          const countries = {
            'Indian': 'India', 'American': 'United States', 'British': 'United Kingdom', 'Canadian': 'Canada', 
            'Australian': 'Australia', 'Spanish': 'Spain', 'French': 'France', 'German': 'Germany',
            'Mexican': 'Mexico', 'South Korean': 'South Korea', 'Japanese': 'Japan', 'Chinese': 'China',
            'Colombian': 'Colombia', 'Puerto Rican': 'Puerto Rico'
          };
          
          const languages = [
            'Haryanvi', 'Punjabi', 'Hindi', 'Bhojpuri', 'English', 'Spanish', 'French', 'German', 'Japanese', 'Korean',
            'Telugu', 'Tamil', 'Malayalam', 'Kannada', 'Bengali', 'Gujarati', 'Marathi', 'Urdu', 'Arabic'
          ];

          for (const [demonym, country] of Object.entries(countries)) {
            if (new RegExp(`\\b${demonym}\\b`, 'i').test(extract)) {
              foundCountry = country; break;
            }
          }
          
          for (const lang of languages) {
            if (new RegExp(`\\b${lang}\\b`, 'i').test(extract)) {
              foundLang = lang; break;
            }
          }

          if (foundCountry || foundLang) {
            setWikiData({ country: foundCountry, language: foundLang, source: 'Wikipedia' });
          }
        }
      } catch (e) {
        console.error("Wiki fetch error", e);
      }
    };
    fetchWiki();
  }, [track]);

  const saveCustomData = () => {
    if (track) {
      localStorage.setItem(`track-override-${track.trackId}`, JSON.stringify(customData));
    }
    setIsEditingData(false);
  };

  useEffect(() => {
    const fetchTrackDetails = async () => {
      if (!track) {
        setLoadingTrack(true);
        try {
          // Fetch track details if navigated directly via URL
          const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song`);
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            setTrack(data.results[0]);
          }
        } catch (err) {
          console.error('Error fetching track:', err);
        } finally {
          setLoadingTrack(false);
        }
      }
    };
    fetchTrackDetails();
  }, [id, track]);

  useEffect(() => {
    const fetchLyrics = async () => {
      if (track) {
        setLoadingLyrics(true);
        try {
          // lrclib API: https://lrclib.net/api/get?artist_name=...&track_name=...
          const artist = encodeURIComponent(track.artistName);
          const title = encodeURIComponent(track.trackName);
          const res = await fetch(`https://lrclib.net/api/get?artist_name=${artist}&track_name=${title}`);
          if (res.ok) {
            const data = await res.json();
            if (data.plainLyrics) {
              setLyrics(data.plainLyrics);
            } else {
              setLyrics('Lyrics not found');
            }
          } else {
            setLyrics('Lyrics not found');
          }
        } catch (err) {
          console.error('Error fetching lyrics:', err);
          setLyrics('Could not load lyrics at this time.');
        } finally {
          setLoadingLyrics(false);
        }
      }
    };
    fetchLyrics();
  }, [track]);

  useEffect(() => {
    const checkLikedStatus = async () => {
      if (!user || !track) return;
      const likeRef = doc(db, 'liked_songs', `${user.uid}_${track.trackId}`);
      const snap = await getDoc(likeRef);
      setIsLiked(snap.exists());
    };
    checkLikedStatus();
    
    const fetchPlaylists = async () => {
      if (!user) return;
      const playlistsRef = collection(db, 'playlists');
      const qPlaylists = query(playlistsRef, where('user_id', '==', user.uid));
      const snap = await getDocs(qPlaylists);
      setUserPlaylists(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchPlaylists();
  }, [user, track]);

  const handleLikeToggle = async () => {
    if (!user) {
      alert("Please sign in to save songs to your library!");
      navigate('/login');
      return;
    }
    setLiking(true);
    const likeRef = doc(db, 'liked_songs', `${user.uid}_${track.trackId}`);
    try {
      if (isLiked) {
        await deleteDoc(likeRef);
        setIsLiked(false);
      } else {
        await setDoc(likeRef, {
          user_id: user.uid,
          track_id: String(track.trackId),
          track_name: track.trackName,
          artist_name: track.artistName,
          genre: track.primaryGenreName,
          artwork_url: track.artworkUrl100?.replace('100x100', '300x300'),
          preview_url: track.previewUrl || null,
          liked_at: new Date().toISOString()
        });
        setIsLiked(true);
      }
    } catch (err) {
      console.error(err);
      alert("Error updating liked songs.");
    } finally {
      setLiking(false);
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    try {
      const playlistRef = doc(db, 'playlists', playlistId);
      await updateDoc(playlistRef, {
        tracks: arrayUnion({
          track_id: String(track.trackId),
          track_name: track.trackName,
          artist_name: track.artistName,
          artwork_url: track.artworkUrl100?.replace('100x100', '300x300'),
          preview_url: track.previewUrl || null
        })
      });
      alert('Added to playlist successfully!');
      setShowPlaylistMenu(false);
    } catch (err) {
      console.error(err);
      alert('Error adding to playlist');
    }
  };

  const handleTranslate = async () => {
    if (!lyrics || lyrics.startsWith('Lyrics not found')) return;
    setTranslating(true);
    try {
      const formData = new URLSearchParams();
      formData.append('q', lyrics);
      
      const res = await fetch(`/translate-api/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });
      
      const data = await res.json();
      
      let finalTranslation = '';
      if (data && data[0]) {
        data[0].forEach(segment => {
          if (segment[0]) finalTranslation += segment[0];
        });
        setTranslatedLyrics(finalTranslation);
        if (data[2]) {
          const langMap = { 'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian', 'hi': 'Hindi', 'ja': 'Japanese', 'ko': 'Korean' };
          setDetectedLang(langMap[data[2]] || data[2].toUpperCase());
        }
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedLyrics('Error translating lyrics. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  if (loadingTrack) {
    return (
      <div className="container loading-container">
        <div className="loader large-loader"></div>
        <p>Loading song details...</p>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="container error-container glass-panel">
        <h2>Song not found</h2>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Return Home</button>
      </div>
    );
  }

  const displayCountry = customData.country || wikiData?.country || (track.country === 'USA' ? 'United States' : track.country);
  const displayLang = customData.language || wikiData?.language || detectedLang;

  return (
    <div className="song-details-page animate-fade-in">
      <div className="bg-glow"></div>
      
      <div className="container">
        <button className="btn btn-ghost back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back to Search
        </button>

        <div className="details-header">
          <div className="artwork-container glass-panel">
            <img 
              src={track.artworkUrl100?.replace('100x100', '600x600')} 
              alt={track.trackName} 
              className="artwork-img"
            />
          </div>
          
          <div className="info-container">
            <div className="badge" style={{ marginBottom: '12px' }}>{track.primaryGenreName}</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <h1 className="song-title" style={{ marginBottom: '4px' }}>{track.trackName}</h1>
                <h2 className="song-artist text-gradient-primary">{track.artistName}</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                <button 
                  className={`btn btn-secondary`} 
                  onClick={() => {
                    if (!user) { alert("Please sign in first"); navigate('/login'); return; }
                    setShowPlaylistMenu(!showPlaylistMenu);
                  }}
                  title="Add to Playlist"
                  style={{ padding: '12px', borderRadius: '50%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}
                >
                  <ListMusic size={20} />
                </button>
                {showPlaylistMenu && (
                  <div className="playlist-dropdown glass-panel" style={{ position: 'absolute', top: '100%', right: '50%', marginTop: '8px', minWidth: '200px', zIndex: 100, padding: '8px', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 8px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>Save to Playlist</h4>
                    {userPlaylists.length > 0 ? userPlaylists.map(pl => (
                      <button key={pl.id} onClick={() => handleAddToPlaylist(pl.id)} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '8px', fontSize: '13px' }}>
                        {pl.name}
                      </button>
                    )) : (
                      <p style={{ fontSize: '12px', padding: '8px', margin: 0, color: 'var(--text-muted)' }}>No playlists found. Create one in your Profile.</p>
                    )}
                  </div>
                )}
                
                <button 
                  className={`btn ${isLiked ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={handleLikeToggle}
                  disabled={liking}
                  title={isLiked ? "Remove from Liked Songs" : "Add to Liked Songs"}
                  style={{ padding: '12px', borderRadius: '50%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' }}
                >
                  {liking ? <div className="loader" style={{width: 24, height: 24}}></div> : <Heart size={24} fill={isLiked ? '#000' : 'none'} color={isLiked ? '#000' : '#fff'} />}
                </button>
              </div>
            </div>
            
            <div className="meta-grid" style={{ marginTop: '24px' }}>
              <div className="meta-card glass-panel">
                <User className="meta-icon" />
                <div className="meta-info">
                  <span className="meta-label">Singer / Artist</span>
                  <span className="meta-value">{track.artistName}</span>
                </div>
              </div>
              <div className="meta-card glass-panel">
                <Globe className="meta-icon" />
                <div className="meta-info" style={{ flex: 1 }}>
                  <span className="meta-label">Origin Country {wikiData?.country && !customData.country && <span style={{fontSize: '10px', color: 'var(--primary-color)'}}>(Wiki)</span>}</span>
                  {isEditingData ? (
                    <input 
                      type="text" 
                      value={customData.country !== '' ? customData.country : displayCountry}
                      onChange={(e) => setCustomData({...customData, country: e.target.value})}
                      style={{ background: 'var(--bg-color-light)', border: '1px solid var(--primary-color)', color: '#fff', borderRadius: '4px', padding: '4px', width: '100%', fontSize: '14px' }}
                    />
                  ) : (
                    <span className="meta-value" style={{ borderBottom: customData.country ? '1px dashed var(--primary-color)' : 'none' }}>
                      {displayCountry}
                    </span>
                  )}
                </div>
              </div>
              <div className="meta-card glass-panel">
                <Disc className="meta-icon" />
                <div className="meta-info">
                  <span className="meta-label">Album / Collection</span>
                  <span className="meta-value">{track.collectionName || 'Single'}</span>
                </div>
              </div>
              <div className="meta-card glass-panel">
                <Calendar className="meta-icon" />
                <div className="meta-info">
                  <span className="meta-label">Release Date</span>
                  <span className="meta-value">{new Date(track.releaseDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {track.previewUrl && (
              <div className="audio-player-container" style={{ marginTop: '24px' }}>
                <button 
                  onClick={() => playTrack(track)} 
                  className="btn btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '30px' }}
                >
                  {currentTrack?.trackId === track.trackId && isPlaying ? <Pause size={20} fill="#000" /> : <PlayCircle size={20} />}
                  {currentTrack?.trackId === track.trackId && isPlaying ? 'Pause Preview' : 'Play Preview'}
                </button>
              </div>
            )}
            
            <div className="external-links" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <a 
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(track.trackName + ' ' + track.artistName + ' official')}`} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-ghost" 
                style={{ flex: 1, padding: '12px', textAlign: 'center', background: 'rgba(255,0,0,0.05)', color: '#ff4b4b', border: '1px solid rgba(255,0,0,0.3)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.501 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.377.55 9.377.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Listen on YouTube
              </a>
              <a 
                href={`https://open.spotify.com/search/${encodeURIComponent(track.trackName + ' ' + track.artistName)}`} 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-ghost" 
                style={{ flex: 1, padding: '12px', textAlign: 'center', background: 'rgba(30,215,96,0.05)', color: '#1ed760', border: '1px solid rgba(30,215,96,0.3)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.54.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM20.16 9.6C16.44 7.38 9.6 7.2 5.581 8.401c-.6.181-1.2-.181-1.38-.781s.18-1.2.78-1.381c4.62-1.38 12.18-1.2 16.38 1.32.54.301.72 1 .42 1.56-.301.54-1 .72-1.62.48z"/>
                </svg>
                Listen on Spotify
              </a>
            </div>
          </div>
        </div>

        <div className="content-section">
          <div className="lyrics-panel glass-panel">
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Lyrics</h3>
              {!loadingLyrics && lyrics && !lyrics.startsWith('Lyrics not found') && !lyrics.startsWith('Could not load') && (
                <div className="translate-controls" style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    className="lang-select"
                    value={targetLang} 
                    onChange={(e) => setTargetLang(e.target.value)}
                    style={{ background: '#121825', color: '#fff', border: '1px solid #2e3c50', borderRadius: '6px', padding: '6px 12px' }}
                  >
                    <option value="es">Spanish</option>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="ja">Japanese</option>
                  </select>
                  <button className="btn btn-primary" onClick={handleTranslate} disabled={translating} style={{ padding: '6px 14px' }}>
                    {translating ? 'Translating...' : 'Translate'}
                  </button>
                </div>
              )}
            </div>
            <div className="panel-body">
              {loadingLyrics ? (
                <div className="lyrics-loading">
                  <div className="loader"></div>
                  <p>Fetching lyrics from the database...</p>
                </div>
              ) : lyrics === 'Lyrics not found' || lyrics === 'Could not load lyrics at this time.' ? (
                <div className="empty-state" style={{ padding: '40px 0', textAlign: 'center' }}>
                  <Globe size={48} className="empty-icon" style={{ opacity: 0.5, marginBottom: '16px' }} />
                  <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Official lyrics are not available for this track.</p>
                  <a 
                    href={`https://www.google.com/search?q=${encodeURIComponent(track.trackName + ' ' + track.artistName + ' lyrics')}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-secondary"
                  >
                    Search Lyrics on Google
                  </a>
                </div>
              ) : (
                <div className="lyrics-container" style={{ display: translatedLyrics ? 'flex' : 'block', gap: '24px' }}>
                  <div className="lyrics-col" style={{ flex: 1, minWidth: 0 }}>
                    {translatedLyrics && <h4 style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Original</h4>}
                    <pre className="lyrics-text">{lyrics}</pre>
                  </div>
                  {translatedLyrics && (
                    <div className="lyrics-col" style={{ flex: 1, minWidth: 0, borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
                      <h4 style={{ color: 'var(--primary-color)', marginBottom: '16px' }}>Translated</h4>
                      <pre className="lyrics-text">{translatedLyrics}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="additional-info">
            <div className="glass-panel info-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: 0, paddingBottom: 0, borderBottom: 'none' }}>Track Data</h3>
                {isEditingData ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                     <button onClick={saveCustomData} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}><Save size={14} /> Save</button>
                     <button onClick={() => setIsEditingData(false)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }}><X size={14} /> Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setIsEditingData(true)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}><Edit2 size={14} /> Correct Info</button>
                )}
              </div>
              <ul className="data-list">
                <li>
                  <span className="data-label"><Languages size={14} style={{display: 'inline', marginRight: '4px', verticalAlign: 'middle'}}/> Language {wikiData?.language && !customData.language && <span style={{fontSize: '10px', color: 'var(--primary-color)'}}>(Wiki)</span>}</span>
                  {isEditingData ? (
                    <input 
                      type="text" 
                      value={customData.language !== '' ? customData.language : displayLang}
                      onChange={(e) => setCustomData({...customData, language: e.target.value})}
                      style={{ background: 'var(--bg-color-light)', border: '1px solid var(--primary-color)', color: '#fff', borderRadius: '4px', padding: '4px', textAlign: 'right', width: '120px', fontSize: '14px' }}
                    />
                  ) : (
                    <span className="data-value" style={{ borderBottom: customData.language ? '1px dashed var(--primary-color)' : 'none' }}>
                      {displayLang}
                    </span>
                  )}
                </li>
                <li>
                  <span className="data-label"><Disc size={14} style={{display: 'inline', marginRight: '4px', verticalAlign: 'middle'}}/> Record Label</span>
                  {isEditingData ? (
                    <input 
                      type="text" 
                      value={customData.label !== '' ? customData.label : (track.collectionName ? `Rel. by ${track.collectionName}` : 'Unknown')}
                      onChange={(e) => setCustomData({...customData, label: e.target.value})}
                      style={{ background: 'var(--bg-color-light)', border: '1px solid var(--primary-color)', color: '#fff', borderRadius: '4px', padding: '4px', textAlign: 'right', width: '120px', fontSize: '14px' }}
                    />
                  ) : (
                    <span className="data-value" style={{ borderBottom: customData.label ? '1px dashed var(--primary-color)' : 'none' }}>
                      {customData.label || 'Standard License'}
                    </span>
                  )}
                </li>
                <li>
                  <span className="data-label">Explicitness</span>
                  <span className="data-value">{track.trackExplicitness === 'explicit' ? 'Explicit' : 'Clean'}</span>
                </li>
                <li>
                  <span className="data-label">Track Count</span>
                  <span className="data-value">{track.trackNumber} of {track.trackCount}</span>
                </li>
                <li>
                  <span className="data-label">Country origin</span>
                  <span className="data-value">{displayCountry}</span>
                </li>
                <li>
                  <span className="data-label">Content Advisory</span>
                  <span className="data-value">{track.contentAdvisoryRating || 'N/A'}</span>
                </li>
                <li>
                  <span className="data-label">Streamable</span>
                  <span className="data-value">{track.isStreamable ? 'Yes' : 'No'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SongDetails;
