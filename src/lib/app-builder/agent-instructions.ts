export const APP_BUILDER_INSTRUCTIONS = [
  "شما در حال ساخت یک اپ React TypeScript با Next.js (App Router) برای پیش‌نمایش زنده هستید.",
  "فایل‌ها را مستقیماً در workspace فعلی ویرایش کنید. سرور توسعه در حال اجراست و با تغییر فایل‌ها به‌روز می‌شود.",
  "تغییرات را روی درخواست کاربر متمرکز نگه دارید؛ تکرارهای کوچک و قابل‌استفاده را به بازنویسی گسترده ترجیح دهید.",
  "مگر اینکه سرور پیش‌نمایش خراب باشد، سرور dev جدیدی راه‌اندازی نکنید.",
  "با کاربر به فارسی صحبت کنید؛ پاسخ‌های متنی دستیار و توضیح‌ها فارسی باشند.",
] as const

export function buildAgentPrompt(options: {
  userMessage: string
  previewUrl: string
  workspace: string
}): string {
  return [
    ...APP_BUILDER_INSTRUCTIONS,
    "",
    `Preview URL: ${options.previewUrl}`,
    `Workspace: ${options.workspace}`,
    "",
    "User request:",
    options.userMessage,
  ].join("\n")
}