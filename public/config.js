// إعدادات الربط — ضع هنا رابط تطبيق الويب من Google Apps Script بعد نشره
// (Deploy → New deployment → Web app) ويبدأ بـ https://script.google.com/macros/s/...
window.GHERAS_CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbx-_oy0D3IbcqKa4rvoMXV0VY17u8TMxp1tLfSlg2lthPTX14BGFR2aykhxJaVzk0s/exec",
  // أسماء البرامج التي تظهر خيارات في (اسم البرنامج)، ويضاف تلقائيا خيار (أخرى)
  // إن تركت القائمة فارغة يظهر حقل نصي بدلا منها
  PROGRAMS: ["بيان", "غرس", "فنار", "لبنات", "نادي غراس", "مراجل", "رواء"],
  // الحد الأقصى لحجم الملف الواحد من الشواهد (ميغابايت)
  MAX_FILE_MB: 10,
  // الحد الأقصى لعدد الملفات في السؤال الواحد
  MAX_FILES_PER_QUESTION: 3
};
