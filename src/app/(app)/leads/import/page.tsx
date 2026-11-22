import { PageHeader } from "@/components/shared/page-header";
import { ImportForm } from "./import-form";

export default function ImportLeadsPage() {
  return (
    <div>
      <PageHeader
        title="Impor Leads dari CSV"
        description="Upload file CSV dengan kolom: businessName/name, contactPerson, email, phone, whatsapp, website, address, city, province, industry, businessType. Duplikat (email/telepon/nama sama) otomatis dilewati."
      />
      <ImportForm />
    </div>
  );
}
