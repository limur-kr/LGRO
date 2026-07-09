import { Link } from "react-router-dom"

export function ReportFab() {
  return (
    <div className="fixed bottom-8 right-8 z-50">
      <Link
        to="/report"
        className="group flex items-center overflow-hidden rounded-full bg-flame-red p-4 text-white shadow-2xl transition-all duration-300 hover:scale-110"
      >
        <span className="material-symbols-outlined text-3xl transition-transform group-hover:rotate-12">add</span>
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-bold uppercase tracking-widest transition-all duration-500 group-hover:ml-3 group-hover:max-w-xs">
          REPORT NEW SPOT
        </span>
      </Link>
    </div>
  )
}
