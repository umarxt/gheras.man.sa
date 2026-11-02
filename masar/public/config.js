// إعدادات منصة أسئلة مسار
window.MASAR_CONFIG = {
  // رابط تطبيق الويب من Google Apps Script بعد نشره (ينتهي بـ /exec)
  // إن تركته فارغا تعمل المنصة في وضع المعاينة: البيانات تحفظ في هذا المتصفح فقط،
  // ورموز الإدارة التجريبية: 1111 (المدير المعتمد) و 2222 (مدير الرد)
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxAY6KuiB87ZjZBp5jvrYS52rpZSnAwF1CBzo73FgB9esw236fmS3dk4ck4hL30h7M/exec",
  // أقصى طول للسؤال وللرد (حرف)
  MAX_QUESTION: 600,
  MAX_ANSWER: 3000,
  // مدة «الأحدث» بالساعات
  RECENT_HOURS: 24
};
