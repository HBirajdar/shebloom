import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-4">&#127800;</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h1>
      <p className="text-gray-500 mb-6">The page you are looking for does not exist.</p>
      <button onClick={() => nav('/dashboard')} className="px-6 py-3 bg-rose-500 text-white rounded-xl font-semibold">Go Home</button>
    </div>
  );
}
