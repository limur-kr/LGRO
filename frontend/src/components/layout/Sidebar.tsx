import { useEffect } from "react"
import { NavLink } from "react-router-dom"

const navItems = [
  { to: "/ranking", label: "랭킹" },
  { to: "/map", label: "지도" },
  { to: "/report", label: "제보하기" },
]

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] bg-black/60 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[110] w-72 max-w-[80vw] transform bg-on-background transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="text-title-md font-headline text-white">메뉴</span>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white" aria-label="닫기">
            ✕
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-4 py-3 text-body-lg font-medium ${
                  isActive ? "bg-primary text-on-primary" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
