import { PageWidthContainer } from '@/components/PageWidthContainer';

export default function ApiLoading() {
  return (
    <div className="min-h-screen bg-white">
      <PageWidthContainer className="pt-12 pb-20">
        <div className="mb-10">
          <h1 className="text-[31px] font-semibold text-[#111] mb-2">Developers</h1>
          <div className="animate-pulse rounded bg-gray-200 h-4 w-80" />
        </div>

        <div className="flex gap-5 mb-8">
          <div className="animate-pulse rounded bg-gray-200 h-5 w-10" />
          <div className="animate-pulse rounded bg-gray-200 h-5 w-20" />
          <div className="animate-pulse rounded bg-gray-200 h-5 w-12" />
        </div>

        <div className="border-b border-[#eee] mb-8" />

        <div className="space-y-8">
          <div>
            <div className="animate-pulse rounded bg-gray-200 h-3 w-36 mb-3" />
            <div className="animate-pulse rounded bg-gray-200 h-4 w-96" />
          </div>
          <div className="space-y-[2px]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-[#f8f9fa] py-[14px] px-[16px]" style={{ borderLeft: '3px solid #e5e7eb' }}>
                <div className="animate-pulse rounded bg-gray-200 h-4 w-48 mb-2" />
                <div className="animate-pulse rounded bg-gray-200 h-3 w-64" />
              </div>
            ))}
          </div>
          <div>
            <div className="animate-pulse rounded bg-gray-200 h-3 w-24 mb-3" />
            <div className="animate-pulse rounded bg-gray-200 h-48 w-full" />
          </div>
        </div>
      </PageWidthContainer>
    </div>
  );
}
