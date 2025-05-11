import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { useStore } from "../../app/stores/store";
import { FaSpinner } from 'react-icons/fa';
import logo from '../../../src/LOVAMAP_logo.png';

const ConfirmEmailPage = observer(() => {
  const { userStore } = useStore();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const email = searchParams.get('email') ?? '';
  const token = searchParams.get('token') ?? '';

  useEffect(() => {
    const confirm = async () => {
      if (!email || !token) {
        setError('Invalid or missing confirmation parameters.');
        setIsLoading(false);
        return;
      }

      const result = await userStore.confirmEmail({ email, token });
      if (result) setError(result);
      setIsLoading(false);
    };

    confirm();
  }, [email, token, userStore]);

  return (
    <div className="gradient-form bg-gray-200 h-screen w-full">
      <div className="justify-center py-12 px-6 h-full">
        <div className="flex justify-center items-center flex-wrap h-full g-6 text-gray-800">
          <div className="xl:w-4/12">
            <div className="block bg-white shadow-lg rounded-lg">
              <div className="lg:w-full px-4 md:px-0">
                <div className="p-8 md:p-12 md:mx-6 text-center">
                  <img className="mx-auto w-52 mb-8" src={logo} alt="logo" />
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center text-gray-600">
                      <FaSpinner className="animate-spin mb-3" size={32} />
                      <p>Confirming your email...</p>
                    </div>
                  ) : error ? (
                    // <p className="text-red-600 font-medium text-sm mt-4">{error}</p>
                    <div className="text-red-600 text-sm bg-red-50 p-2 mt-4 rounded">{error}</div>
                  ) : (
                    <div className="text-green-600 text-sm bg-green-50 p-2 mt-4 rounded">
                      Your email has been successfully confirmed!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ConfirmEmailPage;