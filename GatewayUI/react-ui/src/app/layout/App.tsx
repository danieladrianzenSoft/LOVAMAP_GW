import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import Layout from './layout';
import { store } from '../stores/store';
import { useStore } from '../stores/store';
import { Toaster, toast } from 'react-hot-toast';

const App: React.FC = () => {
  const { userStore, commonStore } = useStore();

  useEffect(() => {
    if (commonStore.accessToken) {
      userStore.getCurrentUser().catch(() => commonStore.setToken(null));
    }
  }, [commonStore, userStore]);


  return (
    <BrowserRouter>
    <Toaster
        position="bottom-right"
        reverseOrder={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#333',
          },
          // You can specify options per toast type here
          success: {
            iconTheme: {
              primary: '#000',
              secondary: '#fff',
            },
          },
        }}
      />
      <Layout />
    </BrowserRouter>
  );
};

export default App;