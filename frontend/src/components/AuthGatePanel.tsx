export function AuthGatePanel({
  title = "관리자 대시보드",
  message,
  onLoginClick,
}: {
  title?: string
  message: string
  onLoginClick?: () => void
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center md:px-8">
      <h1 className="mb-4 text-headline-lg font-headline">{title}</h1>
      <p className="mb-6 text-body-sm text-on-surface-variant">{message}</p>
      {onLoginClick && (
        <button type="button" onClick={onLoginClick} className="hard-shadow bg-primary px-6 py-3 text-title-md text-on-primary">
          로그인
        </button>
      )}
    </div>
  )
}
