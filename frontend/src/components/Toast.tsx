import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';

interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info', title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info', title?: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Layer */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '380px' }}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6';
  const icon = toast.type === 'success' ? '✓' : toast.type === 'error' ? '⚠️' : 'ℹ️';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        background: '#1e293b',
        color: '#ffffff',
        padding: '14px 16px',
        borderRadius: '10px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        borderLeft: `4px solid ${bgColor}`,
        fontFamily: 'Pretendard, -apple-system, sans-serif',
        fontSize: '0.85rem',
        lineHeight: '1.4',
      }}
    >
      <span style={{ fontSize: '1.1rem', lineHeight: '1' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        {toast.title && <div style={{ fontWeight: 700, marginBottom: '2px' }}>{toast.title}</div>}
        <div>{toast.message}</div>
      </div>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer', padding: 0, marginLeft: '4px' }}
      >
        &times;
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (msg: string) => console.log('Toast:', msg),
    };
  }
  return context;
}
