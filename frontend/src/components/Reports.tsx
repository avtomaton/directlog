import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Flight } from '../types';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend);

export default function Reports({ flights }: { flights: Flight[] }) {
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } } } };
  
  const landingsData = { labels: ['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'], datasets: [{ data: [8,5,12,7,9,11,6,14,10,8,13,9], backgroundColor: '#0ea5e9', borderRadius: 6 }] };
  const categoryData = { labels: ['SEL','MEL','Night'], datasets: [{ data: [892,215,140], backgroundColor: ['#0ea5e9','#1e40af','#22d3ee'], borderWidth: 0 }] };
  const hoursData = { labels: ['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'], datasets: [{ data: [8.2,5.1,11.3,7.8,9.4,10.2,6.1,13.5,9.8,7.4,12.1,8.7], borderColor: '#0ea5e9', backgroundColor: 'rgba(14,165,233,0.1)', tension: 0.4, fill: true }] };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {[
          { title: 'Landings per Month', component: <Bar data={landingsData} options={chartOptions} /> },
          { title: 'Time by Category', component: <Doughnut data={categoryData} options={{ ...chartOptions, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#94a3b8' } } } }} /> },
          { title: 'Hours Trend', component: <Line data={hoursData} options={chartOptions} /> },
          { title: 'IFR Approaches', component: <Bar data={{ labels: ['ILS','RNAV LPV','RNAV','VOR','NDB'], datasets: [{ data: [24,18,12,8,2], backgroundColor: '#22d3ee', borderRadius: 6 }] }} options={{ ...chartOptions, indexAxis: 'y' as const }} /> },
        ].map((chart) => (
          <div key={chart.title} className="glass rounded-2xl p-6">
            <h3 className="font-semibold mb-4">{chart.title}</h3>
            <div className="h-64">{chart.component}</div>
          </div>
        ))}
      </div>
    </div>
  );
}