import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PortfolioCardProps {
  title: string;
  value: string;
  change: string;
}

export default function PortfolioCard({ title, value, change }: PortfolioCardProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-md font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        <p className={`mt-2 ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
          {change}
        </p>
      </CardContent>
    </Card>
  );
}
