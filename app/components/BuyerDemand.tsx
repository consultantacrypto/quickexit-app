export default function BuyerDemand() {
  const demands = [
    { user: "Gigi V.", capital: "100.000€", target: "Mercedes S-Class / BMW 7", status: "CASH GATA" },
    { user: "Andrei P.", capital: "450.000€", target: "Teren Bran / Moieciu", status: "VERIFICAT" },
    { user: "InvestGroup", capital: "1.2M €", target: "Penthouses Phuket", status: "CASH GATA" },
  ];

  return (
    <div className="bg-black text-white p-8 rounded-[2rem] border-4 border-[#FFD100] shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
      <h3 className="text-2xl font-black uppercase italic mb-6 tracking-tighter">
        Lichiditate <span className="text-[#FFD100]">Disponibilă</span>
      </h3>
      <div className="space-y-4">
        {demands.map((d, i) => (
          <div key={i} className="border-b border-gray-800 pb-4 flex justify-between items-center group cursor-pointer hover:bg-gray-900 p-2 rounded-xl transition-all">
            <div>
              <p className="text-[10px] font-black uppercase text-[#FFD100] italic">{d.status}</p>
              <p className="text-lg font-black italic uppercase leading-none">{d.user} caută {d.target}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-white italic tracking-tighter">{d.capital}</p>
              <p className="text-[8px] font-bold text-gray-500 uppercase">Buget Imediat</p>
            </div>
          </div>
        ))}
      </div>
      <button className="w-full mt-6 bg-[#FFD100] text-black py-4 rounded-xl font-black uppercase text-xs italic hover:scale-105 transition-transform">
        Vinde-le direct activul tău →
      </button>
    </div>
  );
}