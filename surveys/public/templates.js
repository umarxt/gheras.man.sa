/* قوالب جاهزة لبدء استبانة جديدة. كل قالب يبني استبانة كاملة يمكن تعديلها بعد ذلك. */
(function () {
  "use strict";
  const S = window.GSchema;
  const PROGRAMS = ((window.GHERAS_CONFIG || {}).PROGRAMS || []).filter(Boolean);

  function q(type, title, extra = {}) {
    const it = S.newItem(type);
    it.title = title;
    if (extra.options) { it.options = extra.options.map((o) => (typeof o === "string" ? { label: o } : o)); delete extra.options; }
    if (extra.rows) { it.rows = extra.rows.map((r) => ({ id: S.uid(6), label: r })); delete extra.rows; }
    if (extra.cols) { it.cols = extra.cols.map((c) => ({ label: c })); delete extra.cols; }
    if (extra.quiz) { it.quiz = Object.assign(it.quiz || {}, extra.quiz); delete extra.quiz; }
    return Object.assign(it, extra);
  }
  function sec(title, description, items, extra = {}) {
    return Object.assign({ id: S.uid(), title, description, next: "", items }, extra);
  }
  function survey(title, description, kicker, sections, settings = {}) {
    const s = S.blank(title);
    s.description = description;
    s.kicker = kicker;
    s.sections = sections;
    Object.assign(s.settings, settings);
    return s;
  }
  const programQ = () => (PROGRAMS.length
    ? q("dropdown", "البرنامج", { required: true, options: PROGRAMS })
    : q("short", "اسم البرنامج", { required: true }));
  const agree = ["موافق بشدة", "موافق", "محايد", "غير موافق", "غير موافق بشدة"];

  // قالب رسمي من الإدارة: الأجزاء المقفلة لا يعدلها إلا المدير، ويضاف إليها ما يلزم
  function teamJoin() {
    const prev = q("radio", "هل سبق أن كان الفريق تحت مظلة جهة رسمية؟", { required: true, locked: true, options: ["نعم", "لا"] });
    const who = q("short", "ما الجهة التي كان الفريق تحت مظلتها؟", { required: true, locked: true, showIf: { item: prev.id, value: "نعم" } });
    const s = survey("طلب انضمام فريق تطوعي تحت مظلة جمعية غراس",
      "يعبئ هذا الطلب قائد الفريق. اقرأ شروط الانضمام أولا، ثم أجب عن الأسئلة وارفع وثيقة الفريق.",
      "الفرق التطوعية", [
        sec("", "", [
          q("text", "شروط الانضمام والنطاق العام", { locked: true, tone: "terms", description:
            "• أن يكون نشاط الفريق موجها للطفل أو الأسرة، ومتوافقا مع رسالة الجمعية وقيمها.\n" +
            "• أن يكون للفريق قائد مسؤول عنه أمام الجمعية.\n" +
            "• الالتزام بسياسة حماية الطفل ولوائح الجمعية وهويتها في كل نشاط.\n" +
            "• لا يجمع الفريق تبرعات ولا يوقع اتفاقيات باسم الجمعية إلا بإذن مكتوب منها.\n" +
            "• تعبئة وثيقة الفريق وإرفاقها مع هذا الطلب." }),
          q("short", "اسم الفريق", { required: true, locked: true }),
          q("short", "منطقة الفريق (الحي السكني)", { required: true, locked: true, description: "مثال: حي السويدي الغربي" }),
          q("date", "تاريخ تأسيس الفريق", { required: true, locked: true }),
          prev, who
        ]),
        sec("قائد الفريق", "", [
          q("short", "اسم قائد الفريق", { required: true, locked: true }),
          q("paragraph", "نبذة عن قائد الفريق", { required: true, locked: true, description: "خبرته في العمل التطوعي ومع الأطفال، في أسطر قليلة", validation: { kind: "length", op: "max", a: 800, msg: "" } }),
          q("short", "رقم جوال قائد الفريق", { required: true, locked: true, description: "مثال: 0555432555", validation: { kind: "text", op: "phone", msg: "" } })
        ]),
        sec("وثيقة الفريق", "", [
          q("download", "نموذج وثيقة الفريق", { locked: true, description: "حمل النموذج، وعبئه ببيانات فريقكم، ثم صدره وارفعه في السؤال التالي.", media: { url: "", caption: "تحميل نموذج الوثيقة" } }),
          q("file", "ارفع وثيقة الفريق بعد تعبئتها", { required: true, locked: true, description: "بوربوينت أو إكسل أو PDF، حتى ١٠ م.ب", file: { kinds: ["slides", "sheet", "pdf"], maxFiles: 1, maxMB: 10 } })
        ])
      ], { confirmation: "وصل طلب فريقكم، وسيتواصل معكم فريق الجمعية." });
    s.official = true;
    s.theme.accent = "navy";
    return s;
  }

  const T = [
    {
      id: "team", official: true, title: "انضمام فريق تطوعي", desc: "قالب رسمي لتسجيل الفرق تحت مظلة الجمعية", icon: "user",
      build: teamJoin
    },
    {
      id: "blank", title: "استبانة فارغة", desc: "ابدأ من الصفر وأضف ما تريد", icon: "plus",
      build: () => S.blank("استبانة بلا عنوان")
    },
    {
      id: "satisfaction", title: "رضا أولياء الأمور", desc: "مقياس رضا عن برنامج بعد انتهائه", icon: "heart",
      build: () => survey("قياس رضا أولياء الأمور", "نسعد برأيك في البرنامج الذي شارك فيه طفلك، ويساعدنا على تطويره", "استبانة رضا", [
        sec("عن البرنامج", "", [
          programQ(),
          q("radio", "صلتك بالطفل", { required: true, options: ["أب", "أم"], other: true })
        ]),
        sec("رضاك عن البرنامج", "اختر في كل صف ما يعبر عن رأيك", [
          q("grid", "إلى أي حد توافق على العبارات الآتية؟", { required: true, rows: ["محتوى البرنامج مناسب لعمر طفلي", "المواعيد مناسبة", "التواصل مع الأسرة واضح", "لاحظت أثرا إيجابيا على طفلي"], cols: agree }),
          q("rating", "تقييمك العام للبرنامج", { required: true }),
          q("scale", "ما احتمال أن توصي بالبرنامج لغيرك؟", { required: true, scale: { min: 0, max: 10, minLabel: "مستبعد", maxLabel: "مؤكد" } })
        ]),
        sec("ملاحظاتك", "", [
          q("checkbox", "ما أكثر ما أعجبك؟", { options: ["الأنشطة", "المدربون", "المكان", "التنظيم", "الهدايا والجوائز"], other: true }),
          q("paragraph", "اقتراحاتك لتطوير البرنامج")
        ])
      ], { confirmation: "شكرا لك، وصل رأيك وسيصل إلى فريق البرنامج" })
    },
    {
      id: "workshop", title: "تقييم ورشة أو لقاء", desc: "تقييم سريع بعد الورشة أو المحاضرة", icon: "star",
      build: () => survey("تقييم ورشة", "دقيقة واحدة تساعدنا على تحسين اللقاءات القادمة", "تقييم لقاء", [
        sec("", "", [
          q("short", "عنوان الورشة"),
          q("date", "تاريخ الورشة"),
          q("grid", "قيم ما يلي", { required: true, rows: ["المحتوى", "المقدم", "الوقت", "المكان والتجهيز"], cols: ["ممتاز", "جيد جدا", "جيد", "ضعيف"] }),
          q("radio", "هل حققت الورشة ما توقعته؟", { required: true, options: ["نعم تماما", "إلى حد ما", "لا"] }),
          q("rating", "تقييمك العام", { required: true }),
          q("paragraph", "ما أهم ما استفدته؟")
        ])
      ])
    },
    {
      id: "registration", title: "التسجيل في برنامج", desc: "بيانات الطفل وولي الأمر مع التحقق من الجوال", icon: "user",
      build: () => survey("التسجيل في برنامج", "سجل طفلك وسنتواصل معك لتأكيد التسجيل", "نموذج تسجيل", [
        sec("بيانات الطفل", "", [
          programQ(),
          q("short", "اسم الطفل الرباعي", { required: true }),
          q("date", "تاريخ الميلاد", { required: true }),
          q("radio", "الجنس", { required: true, options: ["ذكر", "أنثى"] }),
          q("dropdown", "المرحلة الدراسية", { required: true, options: ["رياض الأطفال", "الابتدائية", "المتوسطة", "الثانوية"] }),
          q("checkbox", "اهتمامات الطفل", { options: ["القراءة", "الرياضة", "الرسم", "التقنية", "القرآن الكريم"], other: true })
        ]),
        sec("بيانات ولي الأمر", "", [
          q("short", "اسم ولي الأمر", { required: true }),
          q("short", "رقم الجوال", { required: true, validation: { kind: "text", op: "phone", msg: "" }, description: "مثال: 0555432555" }),
          q("file", "صورة الهوية الوطنية لولي الأمر", { file: { kinds: ["image", "pdf"], maxFiles: 1, maxMB: 10 } }),
          q("checkbox", "الإقرار", { required: true, options: ["أقر بصحة البيانات وأوافق على سياسة حماية الطفل في الجمعية"] })
        ])
      ], { confirmation: "تم استلام طلب التسجيل، وسنتواصل معك قريبا" })
    },
    {
      id: "quiz", title: "اختبار قبلي وبعدي", desc: "أسئلة بدرجات ومفتاح إجابات وتصحيح تلقائي", icon: "check",
      build: () => survey("اختبار المعارف", "أجب عن الأسئلة الآتية، وتظهر نتيجتك بعد الإرسال", "اختبار", [
        sec("", "", [
          q("short", "الاسم", { required: true }),
          q("radio", "ما الحد الأدنى لعدد المشرفين لكل ١٠ أطفال في الرحلات؟", { required: true, options: ["مشرف واحد", "مشرفان", "ثلاثة مشرفين"], quiz: { points: 1, key: ["مشرفان"], fbOk: "أحسنت", fbBad: "راجع سياسة الرحلات في دليل حماية الطفل" } }),
          q("checkbox", "أي مما يلي من علامات الإساءة التي تستدعي الإبلاغ؟", { required: true, options: ["كدمات متكررة بلا تفسير", "خوف شديد من شخص معين", "حب اللعب مع الأصدقاء", "انطواء مفاجئ"], quiz: { points: 2, key: ["كدمات متكررة بلا تفسير", "خوف شديد من شخص معين", "انطواء مفاجئ"] } }),
          q("short", "ما اسم الوثيقة التي تحدد أهداف المبادرة ومؤشراتها؟", { required: true, quiz: { points: 1, key: ["وثيقة المبادرة", "وثيقه المبادره"] } })
        ])
      ], { quiz: { on: true, release: "now", showMissed: true, showCorrect: true, showPoints: true } })
    },
    {
      id: "staff", title: "استطلاع رأي الموظفين", desc: "بتوجيه إلى قسم حسب الإجابة", icon: "branch",
      build: () => {
        const field = sec("العمل الميداني", "", [
          q("checkgrid", "ما الذي تحتاجه في كل جانب؟", { rows: ["التدريب", "الأدوات", "الإشراف"], cols: ["أحتاج المزيد", "كاف", "لا ينطبق"] }),
          q("paragraph", "أبرز تحد تواجهه في الميدان")
        ]);
        const office = sec("العمل المكتبي", "", [q("paragraph", "ما الذي يسهل عملك اليومي؟")]);
        const end = sec("الختام", "", [q("scale", "رضاك العام عن بيئة العمل", { required: true, scale: { min: 1, max: 5, minLabel: "منخفض", maxLabel: "مرتفع" } })]);
        const first = sec("", "", [
          q("radio", "طبيعة عملك", { required: true, branch: true, options: [{ label: "ميداني مع الأطفال", go: field.id }, { label: "مكتبي أو إداري", go: office.id }] })
        ]);
        field.next = end.id;
        return survey("استطلاع رأي الموظفين", "الاستطلاع بلا اسم، ورأيك يصل كما هو", "استطلاع داخلي", [first, field, office, end]);
      }
    }
  ];

  window.GSurveyTemplates = T;
})();
