import SnapshotPanel from '@/components/snapshot/SnapshotPanel'

export default function ContextManager() {
  return (
    <div className="h-screen bg-background dot-grid-bg relative overflow-hidden">
      <div className="relative z-10 h-full">
        <section className="absolute left-6 right-6 top-20 bottom-6 floating-window liquid-vessel rounded-[32px] p-6 overflow-hidden flex flex-col">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-[16px] font-semibold text-on-surface">快照库</h1>
              <p className="text-[12px] text-outline">浏览、恢复和整理灵感气泡工作区的语义快照</p>
            </div>
          </div>

          <div className="edge-fade-scroll min-h-0 flex-1 overflow-y-auto pr-1 pb-10">
            <SnapshotPanel />
          </div>
        </section>
      </div>
    </div>
  )
}
