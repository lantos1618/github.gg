import { PageWidthContainer } from '@/components/PageWidthContainer';

export function RepoSkeleton() {
  return (
    <PageWidthContainer className="pt-6 sm:pt-8 space-y-4">
      <div className="animate-pulse rounded-md bg-gray-200 h-7 w-56" />
      <div className="animate-pulse rounded-md bg-gray-200 h-4 w-32" />
      <div className="space-y-2 mt-6">
        <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
        <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
        <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
        <div className="animate-pulse rounded-md bg-gray-200 h-10 w-full" />
      </div>
    </PageWidthContainer>
  );
}
