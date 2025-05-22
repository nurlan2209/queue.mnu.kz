import httpx
import base64
from app.config import settings

# Голоса для разных языков в Google Cloud TTS
VOICE_CONFIG = {
    'ru': {
        'languageCode': 'ru-RU',
        'name': 'ru-RU-Wavenet-C',
        'ssmlGender': 'FEMALE'
    },
    'kk': {
        # Пробуем Neural2 голоса - они новее
        'languageCode': 'kk-KZ',
        'name': 'kk-KZ-Neural2-A',
        'ssmlGender': 'FEMALE'
    },
    'en': {
        'languageCode': 'en-US',
        'name': 'en-US-Wavenet-F',
        'ssmlGender': 'FEMALE'
    }
}

# Запасные варианты для казахского
KAZAKH_FALLBACK_VOICES = [
    {'name': 'kk-KZ-Neural2-A', 'gender': 'FEMALE'},
    {'name': 'kk-KZ-Neural2-B', 'gender': 'MALE'},
    {'name': 'kk-KZ-Wavenet-A', 'gender': 'FEMALE'},
    {'name': 'kk-KZ-Standard-A', 'gender': 'FEMALE'},
    {'name': 'kk-KZ-Standard-B', 'gender': 'MALE'},
]

# Шаблоны текстов для озвучки
ANNOUNCEMENT_TEMPLATES = {
    'ru': "Талон номер {queue_number}, пройдите к столу {desk}",
    'kk': "Талон нөмірі {queue_number}, {desk} үстеліне өтіңіз", 
    'en': "Ticket number {queue_number}, please proceed to desk {desk}"
}

async def generate_speech(
    queue_number: int,
    full_name: str,
    desk: str,
    language: str = 'ru'
) -> dict:
    """
    Генерирует речь через Google Cloud Text-to-Speech
    """
    try:
        print(f"🎤 Google TTS: номер {queue_number}, {full_name}, стол {desk}, язык {language}")
        
        if not settings.GOOGLE_TTS_API_KEY:
            return {
                'success': False,
                'audio_base64': None,
                'text': '',
                'language': language,
                'error': 'Google API ключ не настроен'
            }
        
        # Определяем язык
        if language not in VOICE_CONFIG:
            language = 'ru'
        
        # Формируем текст
        template = ANNOUNCEMENT_TEMPLATES.get(language, ANNOUNCEMENT_TEMPLATES['ru'])
        text = template.format(
            queue_number=queue_number,
            full_name=full_name,
            desk=desk
        )
        
        print(f"📝 Текст: {text}")
        
        # URL с API ключом
        url = f"https://texttospeech.googleapis.com/v1/text:synthesize?key={settings.GOOGLE_TTS_API_KEY}"
        
        # Для казахского пробуем разные голоса
        if language == 'kk':
            for voice_option in KAZAKH_FALLBACK_VOICES:
                print(f"🔄 Пробуем казахский голос: {voice_option['name']}")
                
                request_data = {
                    "input": {"text": text},
                    "voice": {
                        "languageCode": 'kk-KZ',
                        "name": voice_option['name'],
                        "ssmlGender": voice_option['gender']
                    },
                    "audioConfig": {
                        "audioEncoding": "MP3",
                        "speakingRate": 1.0
                    }
                }
                
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.post(url, json=request_data, timeout=30.0)
                    
                    print(f"📡 Ответ Google для {voice_option['name']}: {response.status_code}")
                    
                    if response.status_code == 200:
                        result = response.json()
                        audio_base64 = result.get('audioContent', '')
                        print(f"✅ Казахский голос {voice_option['name']} работает! Размер: {len(audio_base64)} символов")
                        
                        return {
                            'success': True,
                            'audio_base64': audio_base64,
                            'text': text,
                            'language': language,
                            'error': None
                        }
                    else:
                        print(f"❌ Голос {voice_option['name']} не работает: {response.status_code}")
                        
                except Exception as e:
                    print(f"💥 Ошибка с голосом {voice_option['name']}: {e}")
                    continue
            
            # Если ни один казахский голос не работает
            print("❌ Все казахские голоса не работают, используем русский")
            language = 'ru'
        
        # Обычная генерация для других языков или fallback
        voice_config = VOICE_CONFIG[language]
        request_data = {
            "input": {"text": text},
            "voice": {
                "languageCode": voice_config['languageCode'],
                "name": voice_config['name'],
                "ssmlGender": voice_config['ssmlGender']
            },
            "audioConfig": {
                "audioEncoding": "MP3",
                "speakingRate": 1.0
            }
        }
        
        print(f"🚀 Отправляем в Google TTS...")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=request_data, timeout=30.0)
        
        print(f"📡 Ответ Google: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            audio_base64 = result.get('audioContent', '')
            
            print(f"✅ Google TTS успех! Размер: {len(audio_base64)} символов")
            
            return {
                'success': True,
                'audio_base64': audio_base64,
                'text': text,
                'language': language,
                'error': None
            }
        else:
            error_text = response.text
            print(f"❌ Google TTS ошибка: {response.status_code} - {error_text}")
            return {
                'success': False,
                'audio_base64': None,
                'text': text,
                'language': language,
                'error': f"Google API Error: {response.status_code}"
            }
            
    except Exception as e:
        print(f"💥 Google TTS exception: {e}")
        return {
            'success': False,
            'audio_base64': None,
            'text': text if 'text' in locals() else '',
            'language': language,
            'error': str(e)
        }