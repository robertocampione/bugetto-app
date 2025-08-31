import OperationForm from "./OperationForm";

export default function OperationsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Nuova Operazione</h2>
      <OperationForm />
    </div>
  );
}
