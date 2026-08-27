import React, { useState } from 'react';
import { Trophy, Zap, BookOpen, Flame, Crown, Medal, Sparkles, ChevronRight } from 'lucide-react';
import { getMediaUrl } from '../services/api';
import '../styles/LeaderboardWidget.css';

export const LeaderboardWidget = ({ dashboardData, currentUser, onUserClick }) => {
  const [leaderboardType, setLeaderboardType] = useState('words'); // 'words' | 'learned' | 'streak'

  // Extract list based on active tab
  const getActiveList = () => {
    if (!dashboardData) return [];
    if (leaderboardType === 'words') return dashboardData.leaderboard || [];
    if (leaderboardType === 'learned') return dashboardData.learnedLeaderboard || [];
    return dashboardData.streakLeaderboard || [];
  };

  const currentList = getActiveList();

  // Helper for displaying score metric
  const formatMetric = (item) => {
    if (!item) return '';
    if (leaderboardType === 'words') return `${item.wordsStudied || 0} từ`;
    if (leaderboardType === 'learned') return `${item.learnedCount || 0} từ`;
    return `${item.streak || 0} ngày`;
  };

  // Helper for score badge class
  const getScoreBadgeClass = () => {
    if (leaderboardType === 'words') return 'lb-score-today';
    if (leaderboardType === 'learned') return 'lb-score-learned';
    return 'lb-score-streak';
  };

  const getScoreIcon = () => {
    if (leaderboardType === 'words') return <Zap size={13} />;
    if (leaderboardType === 'learned') return <BookOpen size={13} />;
    return <Flame size={13} />;
  };

  // Top 3 Podium slice
  const top1 = currentList[0] || null;
  const top2 = currentList[1] || null;
  const top3 = currentList[2] || null;

  // Ranks 4 to 10
  const remainingList = currentList.slice(3, 10);

  // Find current user's rank in this list
  const userRankIndex = currentUser
    ? currentList.findIndex(item => item.username?.toLowerCase() === currentUser.username?.toLowerCase())
    : -1;
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : null;
  const userItem = userRankIndex !== -1 ? currentList[userRankIndex] : null;

  // Render Avatar Helper
  const renderAvatar = (item) => {
    if (!item) return null;
    const hasImage = item.avatar && (item.avatar.startsWith('data:image') || item.avatar.startsWith('http') || item.avatar.startsWith('/'));
    if (hasImage) {
      return <img src={getMediaUrl(item.avatar)} alt={item.username || 'user'} />;
    }
    return item.avatar || (item.username?.[0]?.toUpperCase() || 'U');
  };

  return (
    <div className="lb-widget-card">
      {/* Header */}
      <div className="lb-widget-header">
        <div className="lb-header-title-wrap">
          <div className="lb-trophy-icon-wrap">
            <Trophy size={22} />
          </div>
          <div>
            <h3 className="lb-title-text">Bảng Vinh Danh</h3>
          </div>
        </div>

        <div className="lb-live-badge">
          <span className="lb-live-dot" />
          <span>Trực tiếp</span>
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className="lb-segmented-tabs">
        <button
          type="button"
          onClick={() => setLeaderboardType('words')}
          className={`lb-seg-tab${leaderboardType === 'words' ? ' active' : ''}`}
        >
          <Zap size={15} />
          <span>Hôm nay</span>
        </button>

        <button
          type="button"
          onClick={() => setLeaderboardType('learned')}
          className={`lb-seg-tab${leaderboardType === 'learned' ? ' active' : ''}`}
        >
          <BookOpen size={15} />
          <span>Tổng học</span>
        </button>

        <button
          type="button"
          onClick={() => setLeaderboardType('streak')}
          className={`lb-seg-tab${leaderboardType === 'streak' ? ' active' : ''}`}
        >
          <Flame size={15} />
          <span>Chuỗi ngày</span>
        </button>
      </div>

      {/* Content Area */}
      {currentList.length === 0 ? (
        <div className="lb-empty-state">
          <div className="lb-empty-icon">
            <Sparkles size={24} />
          </div>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
            Chưa có người học trong bảng này
          </p>
          <p style={{ margin: 0, fontSize: '0.82rem' }}>
            {leaderboardType === 'words'
              ? 'Hãy là người đầu tiên hoàn thành mục tiêu học hôm nay!'
              : 'Bắt đầu học để ghi danh lên bảng vàng nhé!'}
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium (Shown if at least 1 user exists) */}
          <div className="lb-podium-container">
            {/* Rank 2 (Left) */}
            {top2 ? (
              <div
                className="lb-podium-col rank-2"
                onClick={() => onUserClick && onUserClick(top2.username)}
                title={`Xem hồ sơ của ${top2.username}`}
              >
                <div className="lb-podium-avatar-wrap">
                  <div className="lb-podium-avatar">
                    {renderAvatar(top2)}
                  </div>
                </div>
                <div className="lb-podium-name">{top2.username}</div>
                <div className="lb-podium-score">{formatMetric(top2)}</div>
                <div className="lb-pedestal">
                  <span className="lb-pedestal-number">2</span>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1 }} />
            )}

            {/* Rank 1 (Center - Gold) */}
            {top1 && (
              <div
                className="lb-podium-col rank-1"
                onClick={() => onUserClick && onUserClick(top1.username)}
                title={`Xem hồ sơ của ${top1.username}`}
              >
                <div className="lb-podium-avatar-wrap">
                  <Crown className="lb-crown-icon" size={24} />
                  <div className="lb-podium-avatar">
                    {renderAvatar(top1)}
                  </div>
                </div>
                <div className="lb-podium-name">{top1.username}</div>
                <div className="lb-podium-score">{formatMetric(top1)}</div>
                <div className="lb-pedestal">
                  <span className="lb-pedestal-number">1</span>
                </div>
              </div>
            )}

            {/* Rank 3 (Right) */}
            {top3 ? (
              <div
                className="lb-podium-col rank-3"
                onClick={() => onUserClick && onUserClick(top3.username)}
                title={`Xem hồ sơ của ${top3.username}`}
              >
                <div className="lb-podium-avatar-wrap">
                  <div className="lb-podium-avatar">
                    {renderAvatar(top3)}
                  </div>
                </div>
                <div className="lb-podium-name">{top3.username}</div>
                <div className="lb-podium-score">{formatMetric(top3)}</div>
                <div className="lb-pedestal">
                  <span className="lb-pedestal-number">3</span>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1 }} />
            )}
          </div>

          {/* Ranks 4 to 10 */}
          {remainingList.length > 0 && (
            <div className="lb-rank-list custom-scrollbar">
              {remainingList.map((item, index) => {
                const rankNum = index + 4;
                const isYou = currentUser && item.username?.toLowerCase() === currentUser.username?.toLowerCase();

                return (
                  <div
                    key={index}
                    className={`lb-list-row${isYou ? ' is-current-user' : ''}`}
                    onClick={() => onUserClick && onUserClick(item.username)}
                    title={`Xem hồ sơ của ${item.username}`}
                  >
                    <div className="lb-row-left">
                      <span className="lb-rank-num">#{rankNum}</span>

                      <div className="lb-row-avatar">
                        {renderAvatar(item)}
                      </div>

                      <div className="lb-row-user-info">
                        <span className="lb-row-username">{item.username || 'Người dùng'}</span>
                        {isYou && <span className="lb-you-badge">Bạn</span>}
                      </div>
                    </div>

                    <span className={`lb-row-score-badge ${getScoreBadgeClass()}`}>
                      {getScoreIcon()} {formatMetric(item)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Your Rank Footer Banner */}
          {currentUser && (
            <div className="lb-user-banner">
              <div className="lb-user-banner-left">
                <div className="lb-row-avatar" style={{ width: 28, height: 28, fontSize: '0.85rem' }}>
                  {renderAvatar(currentUser)}
                </div>
                <div className="lb-banner-text">
                  {userRank ? (
                    <>
                      Bạn đang xếp hạng <strong style={{ color: '#f59e0b' }}>#{userRank}</strong>
                      {userItem && <> ({formatMetric(userItem)})</>}
                    </>
                  ) : (
                    <>Chưa có xếp hạng trong danh sách này</>
                  )}
                </div>
              </div>

              {userRank && userRank <= 3 && (
                <span className="lb-banner-rank-badge">🏆 TOP {userRank}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LeaderboardWidget;
