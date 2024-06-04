import React from 'react';

interface ToastNotificationProps {
  title: string;
  message: string;
  onDismiss: () => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ title, message, onDismiss }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-start space-x-4">
      <div className="flex-1">
        <h1 className="text-lg font-bold">{title}</h1>
        <p>{message}</p>
      </div>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  );
};

export default ToastNotification;