import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { usePlayer } from '../PlayerContext';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, ListMusic, Heart, PlayCircle, Pause, Music } from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  
  const [profile, setProfile] = useState({ display_name: '', avatar_url: '' });
  const [playlists, setPlaylists] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('playlists');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    const fetchUserData = async () => {
      setLoading(true);
      try {
        // Fetch Profile
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
          
        if (profileSnap.exists()) {
          setProfile(profileSnap.data());
        } else {
          // Auto create profile if missing
          const newProfile = { id: user.uid, display_name: user.email.split('@')[0], avatar_url: '' };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
        }

        // Fetch Playlists
        const playlistsRef = collection(db, 'playlists');
        const qPlaylists = query(playlistsRef, where('user_id', '==', user.uid));
        const playlistsSnap = await getDocs(qPlaylists);
        setPlaylists(playlistsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch Liked Songs
        const likedRef = collection(db, 'liked_songs');
        const qLiked = query(likedRef, where('user_id', '==', user.uid));
        const likedSnap = await getDocs(qLiked);
        let songs = likedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        songs.sort((a, b) => new Date(b.liked_at) - new Date(a.liked_at));
        setLikedSongs(songs);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user, navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'profiles', user.uid), {
        display_name: profile.display_name,
        avatar_url: profile.avatar_url
      });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Error updating profile');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleCreatePlaylist = async () => {
    const name = prompt("Enter a name for your new playlist (e.g., 'Gym Mix', 'Chill Vibes'):");
    if (!name || !name.trim()) return;
    
    try {
      const playlistsRef = collection(db, 'playlists');
      const newPlaylist = {
        name: name.trim(),
        user_id: user.uid,
        created_at: new Date().toISOString(),
        tracks: []
      };
      const docRef = await addDoc(playlistsRef, newPlaylist);
      setPlaylists([...playlists, { id: docRef.id, ...newPlaylist }]);
    } catch (err) {
      console.error(err);
      alert("Error creating playlist");
    }
  };

  if (loading) {
    return (
      <div className="profile-page flex-center container">
        <div className="loader" style={{width: 40, height: 40}}></div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="bg-glow"></div>
      <div className="container profile-container">
        
        {/* Left Sidebar - Profile Overview */}
        <div className="profile-sidebar glass-panel">
          <div className="avatar-section">
            <div className="avatar-wrapper">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="avatar-img" />
              ) : (
                <User size={64} className="avatar-placeholder" />
              )}
            </div>
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="edit-profile-form">
                <input 
                  type="text" 
                  value={profile.display_name || ''} 
                  onChange={(e) => setProfile({...profile, display_name: e.target.value})}
                  placeholder="Display Name"
                  className="input-field"
                />
                
                <input 
                  type="text" 
                  value={profile.avatar_url || ''} 
                  onChange={(e) => setProfile({...profile, avatar_url: e.target.value})}
                  placeholder="Avatar Image URL (http://...)"
                  className="input-field"
                />

                <div style={{display: 'flex', gap: '8px', marginTop: '8px'}}>
                  <button type="submit" className="btn btn-primary btn-sm">Save</button>
                  <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary btn-sm">Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <h2 className="profile-name">{profile.display_name || 'Anonymous User'}</h2>
                <p className="profile-email">{user.email}</p>
                <div className="profile-stats">
                  <div className="stat-box">
                    <span className="stat-num">{playlists.length}</span>
                    <span className="stat-label">Playlists</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-num">{likedSongs.length}</span>
                    <span className="stat-label">Liked</span>
                  </div>
                </div>
                <div className="sidebar-actions">
                  <button onClick={() => setIsEditing(true)} className="btn btn-secondary w-full" style={{justifyContent: 'center'}}><Settings size={16}/> Edit Profile</button>
                  <button onClick={handleSignOut} className="btn btn-ghost w-full" style={{justifyContent: 'center', color: '#ef4444'}}><LogOut size={16}/> Sign Out</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="profile-content glass-panel">
          <div className="content-tabs">
            <button 
              className={`tab-btn ${activeTab === 'playlists' ? 'active' : ''}`}
              onClick={() => setActiveTab('playlists')}
            >
              <ListMusic size={18}/> Your Playlists
            </button>
            <button 
              className={`tab-btn ${activeTab === 'likes' ? 'active' : ''}`}
              onClick={() => setActiveTab('likes')}
            >
              <Heart size={18}/> Liked Songs
            </button>
          </div>

          <div className="tab-pane">
            {activeTab === 'playlists' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Your Playlists</h3>
                  <button onClick={handleCreatePlaylist} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                    + Create Playlist
                  </button>
                </div>
                
                <div className="playlists-grid">
                  {playlists.length > 0 ? playlists.map(pl => (
                    <div key={pl.id} className="playlist-card glass-panel">
                      <div className="playlist-cover">
                        {pl.tracks && pl.tracks.length > 0 ? (
                          <img src={pl.tracks[0].artwork_url} alt="" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px'}} />
                        ) : (
                          <Music size={40} className="cover-icon"/>
                        )}
                        <div className="track-count" style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.7)' }}>
                          {pl.tracks?.length || 0} Tracks
                        </div>
                      </div>
                      <div className="playlist-info">
                        <h3>{pl.name}</h3>
                      </div>
                    </div>
                  )) : (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                      <ListMusic size={48} className="empty-icon" />
                      <p>No playlists created yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'likes' && (
              <div className="tracks-list">
                {likedSongs.length > 0 ? likedSongs.map(song => (
                  <div key={song.id} className="track-row glass-panel" onClick={() => navigate(`/song/${song.track_id}`)}>
                    <img src={song.artwork_url} alt="" className="track-row-art" />
                    <div className="track-row-info">
                      <div className="track-row-title">{song.track_name}</div>
                      <div className="track-row-artist">{song.artist_name}</div>
                    </div>
                    <div className="track-row-genre badge">{song.genre || 'Music'}</div>
                    <button 
                      className="btn btn-primary rounded-circle" 
                      style={{padding: '8px', borderRadius: '50%'}}
                      onClick={(e) => {
                        e.stopPropagation();
                        playTrack(song);
                      }}
                    >
                      {currentTrack?.track_id === song.track_id && isPlaying ? <Pause size={20}/> : <PlayCircle size={20}/>}
                    </button>
                  </div>
                )) : (
                  <div className="empty-state">
                    <Heart size={48} className="empty-icon" />
                    <p>You haven't liked any songs yet. Go explore!</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Profile;
