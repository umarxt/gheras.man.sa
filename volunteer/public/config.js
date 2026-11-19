// إعدادات الربط — ضع هنا رابط تطبيق الويب من Google Apps Script بعد نشره
// (Deploy ← New deployment ← Web app) ويبدأ بـ https://script.google.com/macros/s/...
// إذا تركته فارغا يعمل الموقع في «وضع التجربة»: البيانات تحفظ في هذا المتصفح فقط،
// ورمز الإدارة ورمز اعتماد المشرف التجريبي كلاهما 1234.
window.TG_CONFIG = {
  APPS_SCRIPT_URL: "",
  // الحد الأقصى لحجم الملف المرفوع (ميغابايت)
  MAX_FILE_MB: 10,
  // أعمدة ملف «تصدير لمنصة التطوع» بالترتيب: [عنوان العمود كما تطلبه المنصة، الحقل]
  // الحقول: nationalId name gender nationality birthDate phone email city district qualification major employer jobTitle
  //          program hours startDate endDate approvedAt regId
  PLATFORM_COLUMNS: [
    ["رقم الهوية", "nationalId"], ["الاسم", "name"], ["الجنس", "gender"], ["الجنسية", "nationality"], ["تاريخ الميلاد", "birthDate"],
    ["رقم الجوال", "phone"], ["البريد الإلكتروني", "email"], ["المدينة", "city"], ["المؤهل العلمي", "qualification"],
    ["اسم الفرصة", "program"], ["عدد الساعات", "hours"], ["تاريخ البداية", "startDate"], ["تاريخ النهاية", "endDate"]
  ]
};
