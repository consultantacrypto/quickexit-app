export default function Dashboard() {
  return (
    <div className="p-10 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-black uppercase italic mb-8">
          Dashboard <span className="text-[#FFD100]">Personal</span>
        </h1>
        <div className="bg-white p-6 rounded-2xl border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
          <p className="font-bold text-gray-600">Aici vor apărea anunțurile și ofertele tale active.</p>
        </div>
      </div>
    </div>
  );
}