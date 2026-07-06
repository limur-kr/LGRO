export function Footer() {
  return (
    <footer className="w-full border-t border-primary/40 bg-on-background px-4 py-10 text-white/70 md:px-8">
      <div className="mx-auto flex max-w-container-max flex-col gap-2 text-body-sm">
        <span className="text-title-md font-headline text-white">짬뽕지도</span>
        <p>광고성 리뷰 대신 AI 감성 분석으로 검증된 짬뽕 맛집을 소개합니다.</p>
        <p className="text-white/40">© {new Date().getFullYear()} Jjambbong Map</p>
      </div>
    </footer>
  )
}
