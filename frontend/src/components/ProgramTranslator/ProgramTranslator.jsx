import React from 'react';
import { useTranslation } from 'react-i18next';

const ProgramTranslator = ({ programCode, formLanguage }) => {
  const { t, i18n } = useTranslation();

  // Определение категории программы (бакалавриат, магистратура, докторантура)
  const getProgramCategory = (code) => {
    const BACHELOR_PROGRAMS = [
      'accounting', 'appliedLinguistics', 'economicsDataScience', 'finance', 
      'hospitality', 'internationalJournalism', 'internationalLaw', 
      'internationalRelations', 'it', 'jurisprudence', 'management', 
      'marketing', 'psychology', 'tourism', 'translation'
    ];
    
    const MASTER_PROGRAMS = [
      'politicalInternationalRelations', 'appliedLinguistics', 'competitionLaw', 
      'consultingPsychology', 'economics', 'finance', 'intellectualPropertyLaw', 
      'internationalLaw', 'itLaw', 'jurisprudence', 'translation'
    ];
    
    const DOCTORATE_PROGRAMS = ['law', 'phdEconomics'];

    if (BACHELOR_PROGRAMS.includes(code)) return 'bachelor';
    if (MASTER_PROGRAMS.includes(code)) return 'master';
    if (DOCTORATE_PROGRAMS.includes(code)) return 'doctorate';
    return null;
  };

  // Получаем наименование программы на текущем языке
  const getProgramName = (code, formLang) => {
    const category = getProgramCategory(code);
    if (!category) return code; // Если не удалось определить категорию
    
    // Если указан язык формы и он отличается от текущего - показываем в скобках
    if (formLang && formLang !== i18n.language) {
      try {
        // Загружаем перевод для языка формы
        const formLangTranslation = t(`publicQueueForm.programs.${category}.${code}`, { lng: formLang });
        // Текущий перевод
        const currentTranslation = t(`publicQueueForm.programs.${category}.${code}`);
        
        // Если переводы разные, показываем оба
        if (formLangTranslation !== currentTranslation) {
          return `${currentTranslation} (${formLangTranslation})`;
        }
        
        return currentTranslation;
      } catch (error) {
        return t(`publicQueueForm.programs.${category}.${code}`);
      }
    }
    
    // Иначе просто возвращаем перевод на текущем языке
    return t(`publicQueueForm.programs.${category}.${code}`);
  };
  
  return <>{getProgramName(programCode, formLanguage)}</>;
};

export default ProgramTranslator;