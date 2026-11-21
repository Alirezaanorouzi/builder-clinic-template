/** Persian (fa-IR) UI copy for the app builder. */

export const fa = {
  app: {
    name: "سازنده اپ",
    description: "ساخت اپ موبایل با هوش مصنوعی و پیش‌نمایش ابری",
  },
  setup: {
    title: "راه‌اندازی سازنده ابری",
    body: "کلیدهای Clerk و DATABASE_URL را تنظیم کنید، npm run db:push را اجرا کنید و CURSOR_API_KEY را روی سرور قرار دهید.",
    signIn: "ورود",
    signInHint: "پس از پیکربندی احراز هویت وارد شوید.",
  },
  nav: {
    chat: "گفتگو",
    preview: "پیش‌نمایش",
    projects: "پروژه‌ها",
    main: "ناوبری اصلی",
  },
  project: {
    new: "پروژه جدید",
    untitled: "پروژه بدون نام",
    defaultTitle: (n: number) => `پروژه ${n}`,
    titlePattern: /^پروژه \d+$/i,
    rename: "تغییر نام",
    generateName: "تولید نام",
    generatingName: "در حال تولید نام…",
    actions: "عملیات پروژه",
    hideSidebar: "بستن فهرست پروژه‌ها",
    showSidebar: "نمایش فهرست پروژه‌ها",
    openProjects: "باز کردن پروژه‌ها",
    closeProjects: "بستن پروژه‌ها",
    save: "ذخیره",
    cancel: "لغو",
    info: "اطلاعات پروژه",
    infoDescription: "پیش‌نمایش ابری ساندباکس و متادیتای workspace.",
    path: "مسیر",
    preview: "پیش‌نمایش",
    session: "نشست",
    created: "ایجاد",
    updated: "به‌روزرسانی",
    provisioning: "در حال آماده‌سازی…",
    previewReady: "پیش‌نمایش آماده است",
    noPreviewYet: "هنوز پیش‌نمایشی نیست",
  },
  chat: {
    placeholderReady: "چه چیزی می‌خواهید بسازید؟",
    placeholderProvisioning:
      "در حال راه‌اندازی پیش‌نمایش (اولین بار چند دقیقه طول می‌کشد)…",
    placeholderWaiting: "در انتظار آماده شدن پیش‌نمایش…",
    placeholderNotReady: "پیش‌نمایش آماده نیست. پایین «تلاش مجدد» را بزنید.",
    send: "ارسال پیام",
    working: "در حال کار…",
    cursorTyping: "کرسر در حال پاسخ است…",
    assistantThinking: "دستیار در حال فکر کردن است",
    setupBanner:
      "در حال راه‌اندازی پروژه… اولین اجرا ممکن است ۱۰ تا ۴۰ دقیقه طول بکشد.",
    previewStarting:
      "پیش‌نمایش در حال بالا آمدن است. پس از اتمام راه‌اندازی می‌توانید اولین پیام را بفرستید.",
    retrySetup: "تلاش مجدد برای راه‌اندازی",
    openPreview: "پیش‌نمایش",
  },
  preview: {
    iframeTitle: "پیش‌نمایش اپ ساخته‌شده",
    loading: "در حال بارگذاری پیش‌نمایش (اولین بار ۱۰ تا ۴۰ دقیقه)…",
    preparing: "در حال آماده‌سازی محیط پیش‌نمایش…",
    afterSetup: "پیش‌نمایش پس از راه‌اندازی اینجا نمایش داده می‌شود",
    hobbyHint:
      "در پلن Hobby وردسل، راه‌اندازی ساندباکس ممکن است در ۵ دقیقه قطع شود. در صورت خطا از «تلاش مجدد» در گفتگو استفاده کنید.",
    emptyHint: "برای ارسال پرامپت به گفتگو بروید یا در صورت خطا تلاش مجدد کنید.",
    backToChat: "بازگشت به گفتگو",
  },
  auth: {
    signIn: "ورود",
  },
  model: {
    title: "مدل",
    description: "مدل پایه را انتخاب کنید و ویژگی‌های آن را تنظیم کنید.",
    base: "مدل پایه",
    auto: "خودکار",
    composer2: "کامپوزر ۲",
  },
  time: {
    updatedRecently: "به‌تازگی به‌روزرسانی شد",
    updatedJustNow: "همین الان به‌روزرسانی شد",
    unknown: "نامشخص",
  },
  errors: {
    loadProjects: "بارگذاری پروژه‌ها ناموفق بود.",
    createProject: "ایجاد پروژه ناموفق بود.",
    updateProject: "به‌روزرسانی پروژه ناموفق بود.",
    saveMessages: "ذخیره پیام‌ها ناموفق بود.",
    provisionProject: "راه‌اندازی پروژه ناموفق بود.",
    startPreview: "شروع پیش‌نمایش ناموفق بود.",
    agentFailed: "درخواست دستیار ناموفق بود.",
    sessionUnknown: [
      "نشست سازنده شناخته نشد.",
      "از منوی پروژه «آماده‌سازی مجدد» را بزنید یا پروژه را یک‌بار ببندید و دوباره باز کنید.",
    ].join(" "),
    agentBusy:
      "کرسر هنوز روی درخواست قبلی کار می‌کند. کمی صبر کنید و دوباره امتحان کنید.",
    projectNameTimeout: "زمان تولید نام پروژه تمام شد. دوباره امتحان کنید.",
    projectNameFailed: "نام پروژه تولید نشد.",
    projectNameFailedWith: (detail: string) =>
      `نام پروژه تولید نشد. ${detail}`,
    signInRequired: "ورود لازم است.",
    multiUserNotConfigured: "حالت چندکاربره پیکربندی نشده است.",
    projectNotFound: "پروژه پیدا نشد.",
    requestFailed: "درخواست ناموفق بود.",
    provisioningFailed: "راه‌اندازی ناموفق بود.",
    authorizationFailed: "مجوزدهی ناموفق بود.",
    sessionAndMessageRequired: "شناسه نشست و پیام الزامی است.",
    generateProjectNameFailed: "تولید نام پروژه ناموفق بود.",
    provisionNoSession: "راه‌اندازی نشست را برنگرداند.",
    messagesRoleRequired: "در حالت append، message.role الزامی است.",
    sessionRequiredFields: "sessionId و زمینه گفتگو الزامی است.",
    createSessionFailed: "ایجاد نشست ناموفق بود.",
    userApiKeyDisabled: "تنظیمات کلید API کاربر غیرفعال است.",
  },
  sessionErrors: {
    sandboxTimeout: [
      "زمان راه‌اندازی پیش‌نمایش ساندباکس (npm یا Vite) تمام شد.",
      "چند دقیقه صبر کنید و یک‌بار «تلاش مجدد برای راه‌اندازی» را بزنید.",
    ].join(" "),
    sandboxMisconfig: [
      "تمدید زمان سشن ساندباکس از سقف پلن Hobby رد شد.",
      "چند ثانیه صبر کنید و «تلاش مجدد» بزنید؛ اگر ادامه داشت npm run sandboxes:cleanup یا حذف ساندباکس‌های قدیمی در داشبورد وردسل.",
    ].join(" "),
    sandboxConcurrency: [
      "سقف همزمانی ساندباکس وردسل (۱۰ ماشین در Hobby) پر شده است.",
      "ساندباکس‌های قدیمی را در داشبورد وردسل متوقف کنید، پروژه‌های اضافه را حذف کنید، سپس تلاش مجدد کنید.",
    ].join(" "),
    sandboxStorage: [
      "فضای snapshot ساندباکس در تیم Hobby شما پر است.",
      "در داشبورد وردسل بخش Sandboxes را باز کنید، ساندباکس‌ها و snapshotهای قدیمی app-builder را حذف کنید، یا npm run sandboxes:cleanup را اجرا کنید.",
      "سپس تلاش مجدد کنید. برای جلوگیری از پر شدن snapshot در Hobby می‌توانید APP_BUILDER_SANDBOX_PERSISTENT=false را در Production بگذارید (شروع سرد کندتر می‌شود).",
    ].join(" "),
  },
  activity: {
    thinking: "در حال فکر کردن…",
    thought: "فکر:",
    thoughtDone: "فکر انجام شد",
    read: (t: string) => `خواندن ${t}`,
    deleted: (t: string) => `حذف ${t}`,
    created: (t: string) => `ایجاد ${t}`,
    edited: (t: string) => `ویرایش ${t}`,
    paramsTruncated: "پارامترها بریده شد",
    truncated: "(بریده‌شده)",
    redacted: "[محرمانه]",
    readingContext: "در حال خواندن زمینه",
    editingFiles: "در حال ویرایش فایل‌ها",
    checkingChanges: "در حال بررسی تغییرات",
    readContext: "خواندن زمینه",
    editedFiles: "فایل‌ها ویرایش شد",
    checkedChanges: "تغییرات بررسی شد",
    doneSuffix: "انجام شد",
    failedSuffix: "ناموفق بود",
  },
} as const

/** Best-effort Persian labels for streamed agent activity lines. */
export function localizeActivityContent(content: string): string {
  let line = content.replace(/^\*\*(Agent activity|Activity)\*\*\s*/i, "")

  const replacements: Array<[RegExp, string | ((match: string, ...groups: string[]) => string)]> = [
    [/^Thinking(?: through)?(?:\.\.\.)?:?\s*/i, `${fa.activity.thought} `],
    [/^Thought:\s*/i, `${fa.activity.thought} `],
    [/^Reading context$/i, fa.activity.readingContext],
    [/^Read context$/i, fa.activity.readContext],
    [/^Editing files$/i, fa.activity.editingFiles],
    [/^Edited files$/i, fa.activity.editedFiles],
    [/^Checking changes$/i, fa.activity.checkingChanges],
    [/^Checked changes$/i, fa.activity.checkedChanges],
    [/^Cursor is typing\.\.\.$/i, fa.chat.cursorTyping],
    [/params truncated/gi, fa.activity.paramsTruncated],
    [/\(truncated\)/gi, fa.activity.truncated],
    [/\[redacted\]/gi, fa.activity.redacted],
    [/^Read (.+)$/i, (_m, t) => fa.activity.read(t)],
    [/^Deleted (.+)$/i, (_m, t) => fa.activity.deleted(t)],
    [/^Created (.+)$/i, (_m, t) => fa.activity.created(t)],
    [/^Edited (.+)$/i, (_m, t) => fa.activity.edited(t)],
    [/ complete$/i, ` ${fa.activity.doneSuffix}`],
    [/ done$/i, ` ${fa.activity.doneSuffix}`],
    [/ failed$/i, ` ${fa.activity.failedSuffix}`],
  ]

  for (const [pattern, replacement] of replacements) {
    line =
      typeof replacement === "string"
        ? line.replace(pattern, replacement)
        : line.replace(pattern, replacement)
  }

  return line
}

export function defaultProjectTitle(n: number) {
  return fa.project.defaultTitle(n)
}

export function isPlaceholderProjectTitle(title: string) {
  const normalized = title.trim()
  return (
    !normalized ||
    normalized === fa.project.untitled ||
    normalized === "Untitled project" ||
    fa.project.titlePattern.test(normalized) ||
    /^Project \d+$/i.test(normalized)
  )
}

export function getNextProjectNumber(
  titles: string[],
  fallback = 0
): number {
  return (
    titles.reduce((highest, title) => {
      const persian = title.match(/^پروژه (\d+)$/i)
      const english = title.match(/^Project (\d+)$/i)
      const number = persian?.[1] ?? english?.[1]
      return number ? Math.max(highest, Number(number)) : highest
    }, fallback) + 1
  )
}

export function friendlySessionError(message: string): string {
  if (message.includes("Timed out waiting for sandbox port")) {
    const portMatch = message.match(/port (\d+)/)
    const port = portMatch?.[1]
    const base = fa.sessionErrors.sandboxTimeout
    if (port === "3921") {
      return `${base} (بوت runner دستیار روی پورت ${port} طول کشید؛ چند دقیقه دیگر تلاش کنید یا پروژه جدید بسازید.)`
    }
    if (port === "5173") {
      return `${base} (Next.js هنوز بالا نیامده؛ اولین بار ممکن است چند دقیقه طول بکشد.)`
    }
    return base
  }
  if (message.includes("Timed out waiting for Next.js")) {
    return fa.sessionErrors.sandboxTimeout
  }
  if (
    message.includes("extend timeout") ||
    message.includes("maximum execution timeout")
  ) {
    return fa.sessionErrors.sandboxMisconfig
  }
  if (
    message.includes("Concurrency limit exceeded") ||
    message.includes("429")
  ) {
    return fa.sessionErrors.sandboxConcurrency
  }
  if (
    message.includes("Snapshots Storage") ||
    message.includes("payment_required") ||
    message.includes("Status code 402")
  ) {
    return fa.sessionErrors.sandboxStorage
  }
  return message
}

export function friendlyAgentError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : fa.errors.agentFailed

  if (message.toLowerCase().includes("already has active run")) {
    return fa.errors.agentBusy
  }

  if (/unknown app builder session/i.test(message)) {
    return fa.errors.sessionUnknown
  }

  return message
}