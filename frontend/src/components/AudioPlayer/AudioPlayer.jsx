import React, { useEffect, useRef } from 'react';

const AudioPlayer = ({ audioBase64, onEnded, autoPlay = true }) => {
  const audioRef = useRef(null);
  const hasPlayedRef = useRef(false);
  const currentAudioId = useRef(null);

  useEffect(() => {
    if (audioBase64 && audioRef.current && !hasPlayedRef.current) {
      console.log('🎵 AudioPlayer: получен base64 размером', audioBase64.length, 'символов');
      
      // Создаем уникальный ID для этого аудио
      const audioId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      currentAudioId.current = audioId;
      
      // Правильное создание data URL из base64
      const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
      audioRef.current.src = audioUrl;

      if (autoPlay) {
        hasPlayedRef.current = true; // Помечаем что уже играем
        
        // УВЕДОМЛЯЕМ что объявление началось (только один раз)
        setTimeout(() => {
          localStorage.setItem('announcementStatus', JSON.stringify({
            isPlaying: true,
            timestamp: Date.now(),
            audioId: audioId
          }));
          console.log('📢 Уведомили что объявление началось, ID:', audioId);
        }, 100);
        
        // Пытаемся воспроизвести аудио
        audioRef.current.play().then(() => {
          console.log('✅ Аудио начало воспроизводиться, ID:', audioId);
        }).catch(error => {
          console.error('❌ Ошибка воспроизведения аудио:', error);
          hasPlayedRef.current = false; // Сбрасываем флаг при ошибке
          
          // Убираем уведомление если не получилось
          setTimeout(() => {
            localStorage.setItem('announcementStatus', JSON.stringify({
              isPlaying: false,
              timestamp: Date.now(),
              audioId: audioId
            }));
          }, 100);
        });
      }
    }

    // Сброс флага при смене аудио
    return () => {
      hasPlayedRef.current = false;
      // Убираем уведомление при размонтировании (только для текущего аудио)
      if (currentAudioId.current) {
        setTimeout(() => {
          localStorage.setItem('announcementStatus', JSON.stringify({
            isPlaying: false,
            timestamp: Date.now(),
            audioId: currentAudioId.current
          }));
        }, 100);
      }
    };
  }, [audioBase64, autoPlay]);

  const handleEnded = () => {
    console.log('🏁 Аудио закончилось, ID:', currentAudioId.current);
    hasPlayedRef.current = false; // Сбрасываем флаг когда закончилось
    
    // УВЕДОМЛЯЕМ что объявление закончилось
    setTimeout(() => {
      localStorage.setItem('announcementStatus', JSON.stringify({
        isPlaying: false,
        timestamp: Date.now(),
        audioId: currentAudioId.current
      }));
      console.log('📢 Уведомили что объявление закончилось, ID:', currentAudioId.current);
    }, 100);
    
    if (onEnded) {
      onEnded();
    }
  };

  if (!audioBase64) {
    return null;
  }

  return (
    <audio
      ref={audioRef}
      controls={false}
      onEnded={handleEnded}
      preload="auto"
      style={{ display: 'none' }}
    />
  );
};

export default AudioPlayer;