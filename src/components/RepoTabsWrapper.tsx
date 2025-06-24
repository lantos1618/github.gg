"use client";
import RepoTabs from "./RepoTabs";
import { useRouter } from "next/navigation";

interface RepoTabsWrapperProps {
  tabs: { key: string; label: string }[];
  activeTab: string;
  user: string;
  repo: string;
}

export default function RepoTabsWrapper({
  tabs,
  activeTab,
  user,
  repo,
}: RepoTabsWrapperProps) {
  const router = useRouter();
  return (
    <RepoTabs
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={key => {
        if (key === "wiki") {
          router.push(`/${user}/${repo}`);
        } else if (key === "insights") {
          router.push(`/${user}/${repo}/insights`);
        }
      }}
    />
  );
} 