import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPct } from '@/core/format';
import { DEMO_CLASS } from './demoClass';
import { sortRows, toCsv, type LearnerRow, type SortKey } from './aggregate';

const columns: Array<{ key: SortKey; labelKey: string; numeric: boolean }> = [
  { key: 'nickname', labelKey: 'ngo.table.nickname', numeric: false },
  { key: 'lessons', labelKey: 'ngo.table.lessons', numeric: true },
  { key: 'quizPct', labelKey: 'ngo.table.quiz', numeric: true },
  { key: 'health', labelKey: 'ngo.table.health', numeric: true },
  { key: 'months', labelKey: 'ngo.table.months', numeric: true },
  { key: 'daysAgo', labelKey: 'ngo.table.lastActive', numeric: true },
];

/** Builds the CSV in the browser and saves it through a temporary link. */
function downloadCsv(csv: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function LearnersTable({ rows }: { rows: LearnerRow[] }) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'lessons', dir: 'desc' });
  const sorted = useMemo(() => sortRows(rows, sort.key, sort.dir), [rows, sort]);

  const toggle = (key: SortKey, numeric: boolean) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: numeric && key !== 'daysAgo' ? 'desc' : 'asc' }));

  const onDownload = () => {
    const header = [...columns.slice(0, 5).map((c) => t(c.labelKey)), t('ngo.csv.daysAgo')];
    downloadCsv(toCsv(header, sorted), `capito-class-${DEMO_CLASS.code}.csv`);
  };

  const lastActive = (days: number) => (days === 0 ? t('ngo.table.today') : t('ngo.table.daysAgo', { count: days }));

  return (
    <div className="stack">
      <div className="ngo-table-wrap" tabIndex={0} role="region" aria-label={t('ngo.table.caption')}>
        <table className="ngo-table">
          <caption className="ngo-sr">{t('ngo.table.caption')}</caption>
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={c.numeric ? 'is-num' : undefined}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <button type="button" className="ngo-sort" onClick={() => toggle(c.key, c.numeric)}>
                      {t(c.labelKey)}
                      <span aria-hidden="true" className="ngo-sort-mark">
                        {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                      {active && <span className="ngo-sr">, {t(sort.dir === 'asc' ? 'ngo.table.sortAsc' : 'ngo.table.sortDesc')}</span>}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className={r.isDevice ? 'is-device' : undefined}>
                <th scope="row">
                  {r.nickname}
                  {r.isDevice && <span className="ngo-you">{t('ngo.table.you')}</span>}
                </th>
                <td className="num is-num">{r.lessons}</td>
                <td className="num is-num">{r.quizPct === null ? t('ngo.table.noScore') : formatPct(r.quizPct, 0)}</td>
                <td className="num is-num">{r.health}</td>
                <td className="num is-num">{r.months}</td>
                <td className="is-num">{lastActive(r.daysAgo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={onDownload}>
          {t('ngo.csv.button')}
        </button>
        <span className="muted">{t('ngo.csv.note')}</span>
      </div>
    </div>
  );
}
