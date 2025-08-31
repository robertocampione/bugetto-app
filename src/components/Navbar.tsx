import { Menu, Wallet } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Wallet className="w-6 h-6" />
        <span className="font-semibold text-lg">Bugetto App</span>
      </div>
      <Menu className="w-6 h-6 cursor-pointer" />
    </nav>
  );
}
