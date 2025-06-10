// utils/programColors.js - Новый файл для цветовых утилит

// Программы по категориям (из вашего кода)
const BACHELOR_PROGRAMS = [
  'accounting',
  'appliedLinguistics',
  'economicsDataScience',
  'finance',
  'hospitality',
  'internationalJournalism',
  'internationalLaw',
  'internationalRelations',
  'it',
  'jurisprudence',
  'management',
  'marketing',
  'psychology',
  'tourism',
  'translation',
];

const MASTER_PROGRAMS = [
  'politicalInternationalRelations',
  'appliedLinguistics',
  'competitionLaw',
  'consultingPsychology',
  'economics',
  'finance',
  'intellectualPropertyLaw',
  'internationalLaw',
  'itLaw',
  'jurisprudence',
  'translation',
];

const DOCTORATE_PROGRAMS = ['law', 'phdEconomics'];

// Цветовая схема
export const PROGRAM_COLORS = {
  bachelor: {
    background: '#D6EAFF', // Светло-синий для бакалавриата
    text: '#1A2D6B',       // Темно-синий текст
    border: '#90C5FF',     // Синяя граница
    label: 'Бакалавриат'
  },
  master: {
    background: '#DFFFD6', // Светло-зеленый для магистратуры  
    text: '#2D5B1A',       // Темно-зеленый текст
    border: '#90FF90',     // Зеленая граница
    label: 'Магистратура'
  },
  doctorate: {
    background: '#F9D6FF', // Светло-фиолетовый для докторантуры
    text: '#6B1A6B',       // Темно-фиолетовый текст
    border: '#E090FF',     // Фиолетовая граница
    label: 'Докторантура'
  },
  default: {
    background: '#F5F5F5', // Серый по умолчанию
    text: '#333333',       // Темно-серый текст
    border: '#CCCCCC',     // Серая граница
    label: 'Неизвестно'
  }
};

/**
 * Определяет категорию программы по коду
 * @param {string} programCode - Код программы
 * @returns {string} - Категория: 'bachelor', 'master', 'doctorate' или 'default'
 */
export const getProgramCategory = (programCode) => {
  if (!programCode) return 'default';
  
  if (BACHELOR_PROGRAMS.includes(programCode)) return 'bachelor';
  if (MASTER_PROGRAMS.includes(programCode)) return 'master';
  if (DOCTORATE_PROGRAMS.includes(programCode)) return 'doctorate';
  
  return 'default';
};

/**
 * Определяет категорию для массива программ (берет первую)
 * @param {Array} programs - Массив программ
 * @returns {string} - Категория первой программы
 */
export const getProgramCategoryFromArray = (programs) => {
  if (!programs || !Array.isArray(programs) || programs.length === 0) {
    return 'default';
  }
  
  return getProgramCategory(programs[0]);
};

/**
 * Получает цветовую схему для программы
 * @param {string|Array} programs - Код программы или массив программ
 * @returns {Object} - Объект с цветами: {background, text, border, label}
 */
export const getProgramColors = (programs) => {
  let category;
  
  if (Array.isArray(programs)) {
    category = getProgramCategoryFromArray(programs);
  } else {
    category = getProgramCategory(programs);
  }
  
  return PROGRAM_COLORS[category] || PROGRAM_COLORS.default;
};

/**
 * Генерирует CSS-классы для категории программы
 * @param {string|Array} programs - Код программы или массив программ
 * @returns {Object} - Объект с CSS-классами
 */
export const getProgramCSSClasses = (programs) => {
  const category = Array.isArray(programs) 
    ? getProgramCategoryFromArray(programs) 
    : getProgramCategory(programs);
    
  return {
    backgroundClass: `program-${category}-bg`,
    textClass: `program-${category}-text`,
    borderClass: `program-${category}-border`,
    badgeClass: `program-${category}-badge`
  };
};

/**
 * Создает инлайн стили для программы
 * @param {string|Array} programs - Код программы или массив программ
 * @param {string} type - Тип стиля: 'background', 'text', 'border', 'card'
 * @returns {Object} - React style объект
 */
export const getProgramInlineStyles = (programs, type = 'card') => {
  const colors = getProgramColors(programs);
  
  switch (type) {
    case 'background':
      return { backgroundColor: colors.background };
    case 'text':
      return { color: colors.text };
    case 'border':
      return { borderColor: colors.border };
    case 'card':
      return {
        backgroundColor: colors.background,
        color: colors.text,
        borderColor: colors.border
      };
    case 'badge':
      return {
        backgroundColor: colors.text,
        color: colors.background,
        border: `1px solid ${colors.border}`
      };
    default:
      return {};
  }
};

/**
 * Получает CSS переменные для программы
 * @param {string|Array} programs - Код программы или массив программ
 * @returns {Object} - CSS переменные
 */
export const getProgramCSSVariables = (programs) => {
  const colors = getProgramColors(programs);
  
  return {
    '--program-bg': colors.background,
    '--program-text': colors.text,
    '--program-border': colors.border
  };
};