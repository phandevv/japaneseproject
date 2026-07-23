import React, { useEffect, useState } from 'react';
import { X, RotateCcw, ArrowRight, Home } from 'lucide-react';
import '../styles/ShojiScreen.css';

const ShojiScreen = ({ isOpen, onConfirm, onRetry, onNextDay, onClose, message }) => {
  return (
    <div className={`shoji-overlay ${isOpen ? 'is-open is-active' : ''}`}>
      <div className="shoji-door left"></div>
      <div className="shoji-door right"></div>
      
      <div className="shoji-content">
        {onClose && (
          <button className="shoji-close-btn" onClick={onClose} title="Đóng">
            <X size={24} />
          </button>
        )}
        <h2 className="shoji-title jp-text">完了</h2>
        <p className="shoji-message">{message || "Hoàn thành bài học!"}</p>
        
        <div className="shoji-actions">
          {onRetry && (
            <button className="btn btn-secondary flex-center" style={{ gap: '8px' }} onClick={onRetry}>
              <RotateCcw size={18} /> Học lại
            </button>
          )}
          {onNextDay && (
            <button className="btn btn-primary flex-center" style={{ gap: '8px' }} onClick={onNextDay}>
              Tiếp theo <ArrowRight size={18} />
            </button>
          )}
          {(!onRetry && !onNextDay) && onConfirm && (
            <button className="btn btn-primary" style={{ padding: '12px 30px', fontSize: '1.1rem' }} onClick={onConfirm}>
              Xác nhận
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShojiScreen;
