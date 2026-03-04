import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const sections = [
  { title: 'Personal', items: [{ i: '&#128100;', l: 'Edit Profile' }, { i: '&#128276;', l: 'Notifications' }, { i: '&#128260;', l: 'Cycle Settings' }] },
  { title: 'Health', items: [{ i: '&#128202;', l: 'My Reports' }, { i: '&#128105;', l: 'My Doctors' }, { i: '&#128203;', l: 'Health Records' }, { i: '&#128274;', l: 'Privacy' }] },
  { title: 'Support', items: [{ i: '&#10067;', l: 'Help Center' }, { i: '&#11088;', l: 'Rate Us' }, { i: '&#129309;', l: 'Share App' }] },
];

export default function ProfilePage() {
  const nav = useNavigate();
  const user = useAuthStore(s => s.user);
  const clear = useAuthStore(s => s.clearAuth);

  const logout = () => { clear(); nav('/auth'); };

  const handleItem = (label: string) => {
    switch (label) {
      case 'Edit Profile': nav('/setup'); break;
      case 'Notifications': alert('Notification settings coming soon!'); break;
      case 'Cycle Settings': nav('/tracker'); break;
      case 'My Reports': alert('Reports coming soon!'); break;
      case 'My Doctors': nav('/doctors'); break;
      case 'Health Records': alert('Health records coming soon!'); break;
      case 'Privacy': alert('Privacy settings coming soon!'); break;
      case 'Help Center': alert('Help center coming soon!'); break;
      case 'Rate Us': alert('Thank you for using SheBloom!'); break;
      case 'Share App': if (navigator.share) { navigator.share({ title: 'SheBloom', text: 'Check out SheBloom!', url: window.location.origin }); } else { alert('Share link: ' + window.location.origin); } break;
      default: break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-5 pt-10 pb-14 text-white text-center">
        <button onClick={() => nav('/dashboard')} className="absolute left-4 top-4 text-white/80 text-2xl">&#8249;</button>
        <div className="w-20 h-20 mx-auto rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold border-2 border-white/30 mb-3">
          {user?.fullName?.charAt(0) || 'U'}
        </div>
        <h2 className="text-xl font-bold">{user?.fullName || 'User'}</h2>
        <p className="text-xs opacity-80 mt-1">{user?.email || user?.phone || 'No email set'}</p>
        <div className="flex justify-center gap-8 mt-4">
          <div><p className="text-lg font-bold">0</p><p className="text-[10px] opacity-70">Days Tracked</p></div>
          <div><p className="text-lg font-bold">0</p><p className="text-[10px] opacity-70">Articles</p></div>
          <div><p className="text-lg font-bold">0</p><p className="text-[10px] opacity-70">Consults</p></div>
        </div>
      </div>

      <div className="px-5 -mt-6 space-y-4">
        {sections.map(sec => (
          <div key={sec.title} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <p className="text-xs font-bold text-gray-400 px-5 pt-3 uppercase tracking-wider">{sec.title}</p>
            {sec.items.map((item, i) => (
              <button key={item.l} onClick={() => handleItem(item.l)} className={'w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors ' + (i < sec.items.length - 1 ? 'border-b border-gray-50' : '')}>
                <span className="text-lg" dangerouslySetInnerHTML={{ __html: item.i }} />
                <span className="flex-1 text-sm font-semibold text-gray-700">{item.l}</span>
                <span className="text-gray-300">&#8250;</span>
              </button>
            ))}
          </div>
        ))}
        <button onClick={logout} className="w-full py-4 bg-white border-2 border-rose-200 text-rose-600 rounded-2xl font-bold text-sm">Sign Out</button>
      </div>
    </div>
  );
}
