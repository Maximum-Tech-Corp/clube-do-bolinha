import { PageSpinner } from "@/components/ui/spinner";

export default function JogadorLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <PageSpinner />
    </div>
  );
}
