import { Link } from 'react-router-dom';
import { useCrmDemo } from './useCrmDemo';

export default function StatusBars({ rows, empty }) {
  const { basePath } = useCrmDemo();
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) return <p className="gx-help">{empty}</p>;
  const max = Math.max(...rows.map((row) => row.count));
  return (
    <ul className="gx-status-list">
      {rows.map((row) => (
        <li key={row.status}>
          <Link to={`${basePath}/students?admission=${encodeURIComponent(row.status)}`}>
            <span>{row.status}</span>
            <b>{row.count}</b>
          </Link>
          <div className="gx-track" aria-hidden="true">
            <b style={{ width: max ? `${(row.count / max) * 100}%` : '0%' }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
