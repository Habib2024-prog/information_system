import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "../components/ui/button";
import { EmptyState } from "../components/shared/states";
import { PageHeader } from "../components/shared/PageHeader";
import { SectionCard } from "../components/shared/SectionCard";

interface ModulePlaceholderPageProps {
  title: string;
  description: string;
  actionLabel: string;
  children?: ReactNode;
}

export function ModulePlaceholderPage({ title, description, actionLabel, children }: ModulePlaceholderPageProps) {
  return (
    <div className="space-y-7">
      <PageHeader
        title={title}
        description={description}
        actions={<Button variant="primary" disabled aria-disabled="true"><Plus size={17} aria-hidden="true" />{actionLabel}</Button>}
      />
      <SectionCard>
        {children ?? <EmptyState title="بخش آماده اتصال است" description="نمای فهرست و عملیات این بخش پس از نهایی‌شدن مرحله اجرایی فعال می‌شود." />}
      </SectionCard>
    </div>
  );
}
