import { useEffect, useState } from 'react';

export const useRecaptcha = (siteKey) => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Проверяем, не загружен ли уже скрипт
    if (window.grecaptcha) {
      setIsReady(true);
      setIsLoading(false);
      return;
    }

    // Создаем скрипт для загрузки reCAPTCHA
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Ждем пока grecaptcha будет готов
      const checkReady = () => {
        if (window.grecaptcha && window.grecaptcha.ready) {
          window.grecaptcha.ready(() => {
            setIsReady(true);
            setIsLoading(false);
          });
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    };

    script.onerror = () => {
      console.error('Failed to load reCAPTCHA script');
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Очистка при размонтировании
      const existingScript = document.querySelector(`script[src*="recaptcha"]`);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [siteKey]);

  const executeRecaptcha = async (action = 'submit') => {
    if (!window.grecaptcha || !isReady) {
      throw new Error('reCAPTCHA not ready');
    }

    try {
      const token = await window.grecaptcha.execute(siteKey, { action });
      return token;
    } catch (error) {
      console.error('reCAPTCHA execution failed:', error);
      throw error;
    }
  };

  return {
    isReady,
    isLoading,
    executeRecaptcha
  };
};