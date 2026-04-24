import { useMemo } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Flight, Approach } from '../types';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend);

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Reports({ flights }: { flights: Flight[] }) {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
    },
  };

  const { landingsByMonth, hoursByMonth, categoryTotals, approachCounts } = useMemo(() => {
    // Landings & hours by month (last 12 months)
    const now = new Date();
    const landings = new Array(12).fill(0);
    const hours = new Array(12).fill(0);

    flights.forEach(f => {
      if (!f.date) return;
      const d = new Date(f.date);
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsAgo >= 0 && monthsAgo < 12) {
        const idx = (now.getMonth() - monthsAgo + 12) % 12;
        landings[idx] += (f.ldg_day || 0) + (f.ldg_night || 0);
        hours[idx] += f.air_time || 0;
      }
    });

    // Category totals
    let sel = 0, mel = 0, night = 0;
    flights.forEach(f => {
      if (f.multi_engine) mel += f.air_time || 0;
      else sel += f.air_time || 0;
      night += f.night || 0;
    });

    // Approach counts by type
    const approaches: Record<string, number> = {};
    flights.forEach(f => {
      const apps: Approach[] = f.approaches ?? [];
      apps.forEach((a: Approach) => {
        const t = a.type || 'Unknown';
        approaches[t] = (approaches[t] || 0) + (a.actual ? 1 : 0);
      });
    });

    return {
      landingsByMonth: landings,
      hoursByMonth: hours.map(h => Math.round(h * 10) / 10),
      categoryTotals: { sel: Math.round(sel), mel: Math.round(mel), night: Math.round(night) },
      approachCounts: approaches,
    };
  }, [flights]);

  // Build month labels for last 12 months
  const monthLabels = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const m = (now.getMonth() - 11 + i + 12) % 12;
      return MONTH_LABELS[m];
    });
  }, []);

  const landingsData = {
    labels: monthLabels,
    datasets: [{ data: landingsByMonth, backgroundColor: '#0ea5e9', borderRadius: 6 }],
  };

  const categoryData = {
    labels: ['SEL', 'MEL', 'Night'],
    datasets: [{
      data: [categoryTotals.sel, categoryTotals.mel, categoryTotals.night],
      backgroundColor: ['#0ea5e9', '#1e40af', '#22d3ee'],
      borderWidth: 0,
    }],
  };

  const hoursData = {
    labels: monthLabels,
    datasets: [{
      data: hoursByMonth,
      borderColor: '#0ea5e9',
      backgroundColor: 'rgba(14,165,233,0.1)',
      tension: 0.4,
      fill: true,
    }],
  };

  const approachLabels = Object.keys(approachCounts);
  const approachValues = Object.values(approachCounts);
  const approachesData = {
    labels: approachLabels.length > 0 ? approachLabels : ['No data'],
    datasets: [{
      data: approachValues.length > 0 ? approachValues : [0],
      backgroundColor: '#22d3ee',
      borderRadius: 6,
    }],
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>
      {flights.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-slate-400">No flight data yet. Add some flights to see your reports.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { title: 'Landings per Month', component: <Bar data={landingsData} options={chartOptions} /> },
            { title: 'Time by Category', component: <Doughnut data={categoryData} options={{ ...chartOptions, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#94a3b8' } } } }} /> },
            { title: 'Hours Trend', component: <Line data={hoursData} options={chartOptions} /> },
            { title: 'IFR Approaches', component: <Bar data={approachesData} options={{ ...chartOptions, indexAxis: 'y' as const }} /> },
          ].map((chart) => (
            <div key={chart.title} className="glass rounded-2xl p-6">
              <h3 className="font-semibold mb-4">{chart.title}</h3>
              <div className="h-64">{chart.component}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
