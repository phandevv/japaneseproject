import React from 'react';
import { Sparkles, Play, BookOpen, Globe, Users, Video, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/HomePage.css';

const serviceItems = [
  {
    icon: BookOpen,
    title: 'ONLINE',
    description: 'Tiếng Nhật online cho người bận rộn.',
  },
  {
    icon: Globe,
    title: 'OFFLINE',
    description: 'Lớp học trực tiếp cùng Top Sensei.',
  },
  {
    icon: Video,
    title: 'TRỰC TUYẾN',
    description: 'Giáo viên qua Zoom, học tại nhà.',
  },
  {
    icon: Users,
    title: 'KAIWA',
    description: 'Tự tin giao tiếp dù ngữ pháp còn yếu.',
  },
];

const differenceItems = [
  {
    icon: ShieldCheck,
    title: 'Sự đa dạng - cập nhật nhu cầu',
    description: 'SIRO NIHONGO đổi mới chương trình liên tục phù hợp người Việt và mục tiêu JLPT.',
  },
  {
    icon: Sparkles,
    title: 'Lộ trình nhanh - mạnh - chuẩn',
    description: 'Lộ trình dễ tiếp nhận, ôn tập nhịp nhàng, chuẩn đề thi.',
  },
  {
    icon: Play,
    title: 'Đội ngũ trợ giảng',
    description: 'Trợ giảng theo sát từng bước học viên ngoài giờ học.',
  },
  {
    icon: BookOpen,
    title: 'Đội ngũ giáo viên',
    description: 'Giáo viên N2-N1 giàu kinh nghiệm thực chiến.',
  },
];

const HomePage = ({ startStudy, user, streak, onLoginClick, onDailyClick }) => {
  const { t } = useLanguage();

  return (
    <div className="home-page">
      <section className="home-top-banner">
        <div className="container home-banner-inner">
          <div className="home-banner-copy">
            <span className="home-badge">SIRO NIHONGO</span>
            <h1>{t.home.heroMainTitle || 'SIRO NIHONGO - Học tiếng Nhật đỉnh cao'}</h1>
            <p className="home-subtitle">
              {t.home.heroDescription || 'Học tiếng Nhật hiệu quả, tự tin chinh phục JLPT với phương pháp hiện đại và bài học ngắn gọn mỗi ngày.'}
            </p>

            <div className="home-actions">
              <button
                className="btn btn-primary btn-xl"
                onClick={user ? onDailyClick : onLoginClick}
              >
                {user ? t.home.dailyStudy : 'HỌC NGAY'}
              </button>
              {!user && (
                <button className="btn btn-secondary btn-xl" onClick={onLoginClick}>
                  {t.auth.loginTitle}
                </button>
              )}
            </div>

            <div className="hero-pill-grid">
              <div className="hero-pill">15’ mỗi ngày đỗ JLPT</div>
              <div className="hero-pill">Lộ trình nhanh - mạnh - chuẩn</div>
              <div className="hero-pill">Giáo viên N1, chuyên sâu</div>
            </div>

            <p className="home-hero-meta">
              {user ? t.home.streakMsg(user.username, streak || 0) : t.home.loginPrompt}
            </p>
          </div>

          <div className="home-banner-visual">
            <div className="home-banner-slider">
              <div className="slide slide-1" />
              <div className="slide slide-2" />
              <div className="slide slide-3" />
              <div className="slide-overlay">
                <span className="slide-chip">SIRO NIHONGO</span>
                <h3>{t.home.slideTitle}</h3>
                <p>{t.home.slideText}</p>
              </div>
            </div>
            <div className="hero-slider-controls">
              <span className="control active" />
              <span className="control" />
              <span className="control" />
            </div>
          </div>
        </div>
      </section>

      <section className="home-category-section container">
        <div className="category-intro">
          <p className="section-label">Dành cho bạn</p>
          <h2>Những lộ trình phù hợp mọi phong cách học</h2>
        </div>
        <div className="category-grid">
          {serviceItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="service-card">
                <div className="service-icon">
                  <Icon size={22} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="home-difference-section container">
        <div className="difference-grid">
          <div className="difference-copy">
            <p className="section-label">SIRO NIHONGO khác biệt</p>
            <h2>SIRO NIHONGO là SỰ KHÁC BIỆT</h2>
            <p>
              Giải pháp học tiếng Nhật toàn diện với nội dung cập nhật, lộ trình rõ ràng và trợ giảng tận tâm.
            </p>
            <div className="difference-stats">
              <div>
                <strong>Học hiệu quả</strong>
                <span>Lộ trình được tối ưu cho người bận rộn.</span>
              </div>
              <div>
                <strong>Giáo viên chuyên sâu</strong>
                <span>Đội ngũ hướng dẫn trình độ cao, phương pháp thực chiến.</span>
              </div>
              <div>
                <strong>Hỗ trợ 24/7</strong>
                <span>Trợ giảng đồng hành cùng học viên mọi lúc.</span>
              </div>
            </div>
          </div>

          <div className="difference-cards">
            {differenceItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="difference-card">
                  <div className="difference-card-top">
                    <Icon size={20} />
                    <h3>{item.title}</h3>
                  </div>
                  <p>{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="home-feature-section container">
        <h2>{t.home.featuresTitle}</h2>
        <div className="home-feature-grid">
          <div className="feature-card">
            <h3>{t.home.guestFeature1}</h3>
            <p>{t.home.featureDesc1}</p>
          </div>
          <div className="feature-card">
            <h3>{t.home.guestFeature2}</h3>
            <p>{t.home.featureDesc2}</p>
          </div>
          <div className="feature-card">
            <h3>{t.home.guestFeature3}</h3>
            <p>{t.home.featureDesc3}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
