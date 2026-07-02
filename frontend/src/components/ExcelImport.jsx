import React, { useState } from 'react';
import { vocabApi } from '../services/api';
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const ExcelImport = ({ onImportSuccess }) => {
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus('idle');
      setMessage('');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    setStatus('loading');
    try {
      const result = await vocabApi.importExcel(file);
      setStatus('success');
      setMessage(result.message || t.home.importSuccess);
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || error.message || t.home.importFailed);
    }
  };

  return (
    <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--surface-color)', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
      <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Upload size={20} />
        {t.home.importTitle}
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '15px' }}>
        {t.home.importSub}
      </p>
      
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          onChange={handleFileChange}
          style={{ padding: '8px', border: '1px dashed var(--border-color)', borderRadius: '8px', flex: 1, minWidth: '200px' }}
        />
        
        <button 
          className="btn btn-primary" 
          onClick={handleImport}
          disabled={!file || status === 'loading'}
          style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          {status === 'loading' ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
          {t.home.importBtn}
        </button>
      </div>

      {status === 'success' && (
        <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <CheckCircle size={18} />
          {message}
        </div>
      )}

      {status === 'error' && (
        <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertCircle size={18} />
          {message}
        </div>
      )}
    </div>
  );
};

export default ExcelImport;
