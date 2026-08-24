import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import MascotLoader from '../components/MascotLoader';
import { authApi, analyticsApi, getMediaUrl } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Camera, Activity, Calendar, Trophy, Zap, BookOpen } from 'lucide-react';

const VIETNAM_PROVINCES = [
  "An Giang", "Bà Rịa – Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
  "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng",
  "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai", "Đồng Tháp",
  "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh",
  "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên",
  "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng",
  "Lạng Sơn", "Lào Cai", "Long An", "Nam Định", "Nghệ An",
  "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình",
  "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng",
  "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa",
  "Thừa Thiên Huế", "Tiền Giang", "TP Hồ Chí Minh", "Trà Vinh",
  "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
];

const AVATAR_PRESETS = [
  '🦊', '🐼', '🐨', '🐯', '🦁', '🐱', '🐶', '🐰', 
  '🐸', '🐵', '🐔', '🦄', '🐙', '👾', '🤖', '👻'
];

const UserProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateAvatar } = useAuth();
  const fileInputRef = useRef(null);

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [address, setAddress] = useState(user?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [occupation, setOccupation] = useState(user?.occupation || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '');
  const [selectedCoverPhoto, setSelectedCoverPhoto] = useState(user?.coverPhoto || '');
  const [saving, setSaving] = useState(false);

  const coverFileInputRef = useRef(null);

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const data = await analyticsApi.getDashboard();
      setDashboard(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        alert("Kích thước ảnh đại diện phải nhỏ hơn 1.5MB để đảm bảo hiệu năng!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2.5 * 1024 * 1024) {
        alert("Kích thước ảnh bìa phải nhỏ hơn 2.5MB!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedCoverPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };
  
  const triggerCoverUpload = () => {
    coverFileInputRef.current?.click();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        displayName,
        address,
        phone,
        occupation,
        avatar: selectedAvatar,
        coverPhoto: selectedCoverPhoto
      };
      await authApi.updateProfile(payload);
      updateAvatar(payload);
      alert('Cập nhật thông tin cá nhân thành công!');
    } catch (e) {
      console.error(e);
      alert('Cập nhật thất bại: ' + (e?.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------
  // CHARTS DATA PROCESSING
  // ----------------------------------------------------
  const parseStudyDateKey = (raw) => {
    if (!raw) return '';
    if (typeof raw === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
        return raw.trim();
      }
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      }
      return raw.slice(0, 10);
    }
    if (raw instanceof Date) {
      return raw.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    }
    if (Array.isArray(raw)) {
      return `${raw[0]}-${String(raw[1]).padStart(2, '0')}-${String(raw[2]).padStart(2, '0')}`;
    }
    return '';
  };

  const processBarChartData = (history = []) => {
    // Generate last 7 days array
    const chartData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const session = history.find(s => parseStudyDateKey(s.studyDate) === dateStr);
      chartData.push({
        date: d.toLocaleDateString('vi-VN', { weekday: 'short' }),
        words: session ? session.wordsStudied : 0
      });
    }
    return chartData;
  };

  const barData = dashboard?.history ? processBarChartData(dashboard.history) : [];
  const maxWords = Math.max(...barData.map(d => d.words), 10); // at least 10 to show scale

  const processHeatmapData = (history = []) => {
    // Last 365 days
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Start from 364 days ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);

    // Map history for O(1) lookup
    const historyMap = {};
    history.forEach(s => {
      const k = parseStudyDateKey(s.studyDate);
      if (k) historyMap[k] = s.wordsStudied;
    });

    for (let i = 0; i <= 364; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      
      const count = historyMap[dateStr] || 0;
      let level = 0;
      if (count > 0 && count <= 10) level = 1;
      else if (count > 10 && count <= 30) level = 2;
      else if (count > 30 && count <= 50) level = 3;
      else if (count > 50) level = 4;

      days.push({
        date: dateStr,
        count,
        level
      });
    }
    return days;
  };

  const heatmapData = dashboard?.history ? processHeatmapData(dashboard.history) : [];

  const getHeatmapColor = (level) => {
    if (level === 0) return 'var(--surface-hover)';
    if (level === 1) return 'rgba(46, 196, 182, 0.4)';
    if (level === 2) return 'rgba(46, 196, 182, 0.6)';
    if (level === 3) return 'rgba(46, 196, 182, 0.8)';
    if (level === 4) return 'var(--success-color)';
    return 'var(--surface-hover)';
  };

  if (loading) {
    return <MascotLoader message="Đang tải thông tin..." />;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Nunito', sans-serif", paddingBottom: '60px' }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)', marginBottom: '24px', fontWeight: 600 }}
      >
        <ArrowLeft size={20} /> Quay lại
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* ROW 1: PROFILE INFO & QUICK STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* LEFT: PROFILE FORM */}
          <div className="card" style={{ padding: '0', borderRadius: '16px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            
            {/* Cover Photo Area */}
            <div 
              style={{ 
                width: '100%', height: '140px', 
                background: selectedCoverPhoto ? `url(${selectedCoverPhoto}) center/cover no-repeat` : 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                position: 'relative', cursor: 'pointer'
              }}
              onClick={triggerCoverUpload}
              title="Đổi ảnh bìa"
            >
              <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                <Camera size={14} /> Thay ảnh bìa
              </div>
            </div>
            <input type="file" ref={coverFileInputRef} onChange={handleCoverFileChange} accept="image/*" style={{ display: 'none' }} />

            <div style={{ padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '20px', marginTop: '-50px' }}>
                <div 
                  onClick={triggerFileUpload}
                  style={{
                    width: '100px', height: '100px', borderRadius: '50%',
                    backgroundColor: 'var(--surface-color)', border: '4px solid var(--surface-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', position: 'relative', overflow: 'hidden',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)', transition: 'all 0.2s ease',
                    zIndex: 2
                  }}
                >
                  {selectedAvatar && (selectedAvatar.startsWith('data:image') || selectedAvatar.startsWith('http') || selectedAvatar.startsWith('/')) ? (
                    <img src={getMediaUrl(selectedAvatar)} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : selectedAvatar ? (
                    <div style={{ fontSize: '3.5rem' }}>{selectedAvatar}</div>
                  ) : (
                    <div style={{ fontSize: '3rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                      {(displayName ? displayName[0] : user?.username?.[0] || '?').toUpperCase()}
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
                    fontSize: '0.7rem', textAlign: 'center', padding: '4px 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                  }}>
                    <Camera size={12} /> Đổi ảnh
                  </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Tên hiển thị</label>
                    <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Tên hiển thị..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Tên đăng nhập</label>
                    <input type="text" value={user?.username || ''} disabled
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-hover)', color: 'var(--text-secondary)', cursor: 'not-allowed', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Số điện thoại</label>
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Ngành nghề</label>
                    <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="IT, Sinh viên..."
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Địa chỉ</label>
                  <select value={address} onChange={(e) => setAddress(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', cursor: 'pointer', boxSizing: 'border-box' }}
                  >
                    <option value="">-- Chọn Tỉnh / Thành phố --</option>
                    {VIETNAM_PROVINCES.map((prov, idx) => <option key={idx} value={prov}>{prov}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Avatar nhanh:</label>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {AVATAR_PRESETS.map((av, idx) => (
                      <button key={idx} onClick={() => setSelectedAvatar(av)}
                        style={{ fontSize: '1.25rem', padding: '6px 10px', borderRadius: '10px', border: selectedAvatar === av ? '2px solid var(--accent-color)' : '1px solid var(--border-color)', backgroundColor: selectedAvatar === av ? 'var(--accent-light)' : 'var(--surface-color)', cursor: 'pointer', transition: 'all 0.2s ease', flexShrink: 0 }}
                      >{av}</button>
                    ))}
                  </div>
                </div>

                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', marginTop: '10px' }}>
                  <Save size={18} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: STATS & BAR CHART */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning-color)' }}>
                  <Zap size={20} />
                  <span style={{ fontWeight: 700 }}>Streak</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{dashboard?.streak || 0} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ngày</span></div>
              </div>

              <div style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success-color)' }}>
                  <BookOpen size={20} />
                  <span style={{ fontWeight: 700 }}>Đã học</span>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{dashboard?.learnedCount || 0} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>từ</span></div>
              </div>
            </div>

            <div style={{ background: 'var(--surface-color)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: 0, marginBottom: '20px', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} color="var(--accent-color)"/> Tần suất học (7 ngày qua)
              </h3>
              <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', minHeight: '200px' }}>
                {barData.map((d, i) => {
                  const heightPercentage = Math.max((d.words / maxWords) * 100, 5); // min 5% height for visibility
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{d.words}</div>
                      <div style={{ 
                        width: '100%', 
                        maxWidth: '40px', 
                        height: `${heightPercentage}%`, 
                        minHeight: '20px', 
                        background: d.words > 0 ? 'var(--accent-color)' : 'var(--surface-hover)', 
                        borderRadius: '8px 8px 0 0',
                        transition: 'height 0.5s ease-out'
                      }}></div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{d.date}</div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* ROW 2: HEATMAP */}
        <div style={{ background: 'var(--surface-color)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: 0, marginBottom: '20px', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--success-color)"/> Hoạt động học tập (365 ngày)
          </h3>
          
          <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '4px', width: 'max-content' }}>
              {/* Split days into columns of 7 (weeks) */}
              {Array.from({ length: Math.ceil(heatmapData.length / 7) }).map((_, weekIdx) => (
                <div key={weekIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {heatmapData.slice(weekIdx * 7, (weekIdx + 1) * 7).map((d, dayIdx) => (
                    <div 
                      key={dayIdx} 
                      title={`${d.date}: ${d.count} từ vựng`}
                      style={{
                        width: '14px', 
                        height: '14px', 
                        borderRadius: '3px',
                        background: getHeatmapColor(d.level),
                        transition: 'transform 0.1s',
                        cursor: 'crosshair'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
            <span>Ít</span>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: getHeatmapColor(0) }}></div>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: getHeatmapColor(1) }}></div>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: getHeatmapColor(2) }}></div>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: getHeatmapColor(3) }}></div>
            <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: getHeatmapColor(4) }}></div>
            <span>Nhiều</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserProfilePage;
