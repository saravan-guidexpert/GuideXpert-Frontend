import { bottleneckStatus, pipelineShare } from './overviewModel';

const INSIGHTS = [
  ['total', 'Linked students'],
  ['Counselling', 'In counselling'],
  ['Applied', 'Applications submitted'],
  ['Admitted', 'Admissions'],
  ['Enrolled', 'Enrolments'],
  ['Not proceeding', 'Not proceeding'],
];

export default function StudentPipeline({ rows, total, onOpen }) {
  const hotspot = bottleneckStatus(rows);
  const countOf = (status) => rows.find((row) => row.status === status)?.count || 0;
  return (
    <section className="gx-ov-card gx-ov-pipeline gx-ov-rise" aria-labelledby="gx-pipeline-title">
      <div className="gx-ov-card-head">
        <div>
          <h3 id="gx-pipeline-title">Student pipeline</h3>
          <p className="gx-ov-note">Current admission status of linked students. These counts are not a historical conversion funnel.</p>
        </div>
      </div>
      <ul className="gx-ov-insights">
        {INSIGHTS.map(([key, label]) => (
          <li key={key}>
            <span>{label}</span>
            <strong>{key === 'total' ? total : countOf(key)}</strong>
          </li>
        ))}
      </ul>
      <div className="gx-ov-pipe">
        {rows.map((row) => {
          const share = pipelineShare(row.count, total);
          const width = total ? (row.count / total) * 100 : 0;
          const hot = hotspot === row.status;
          return (
            <button key={row.status} type="button" className={hot ? 'is-hot' : ''} onClick={() => onOpen(row.status)}>
              <span className="gx-ov-pipe-name">
                {row.status}
                {hot ? <em>Most students</em> : null}
              </span>
              <span className="gx-ov-bar" aria-hidden="true"><span style={{ width: `${width}%` }} /></span>
              <span className="gx-ov-pipe-num">
                <strong>{row.count}</strong>
                <small>{share == null ? '—' : `${share}%`}</small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
