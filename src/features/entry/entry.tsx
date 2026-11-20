import { useState } from "react";
import type { LogEntry } from "../../interface/interface";

export const Entry = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLogEntry = (entry: LogEntry) => {
    setLogs((previousLogs) => [...previousLogs, entry]);
  };

  return (
    <div className="entry">
      <h1>Mat</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();

          const formData = new FormData(event.currentTarget);
          const newEntry: LogEntry = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            mat: formData.get("mat") as string,
            beteende: formData.get("beteende") as string,
          };

          addLogEntry(newEntry);
          event.currentTarget.reset();
        }}
      >
        <input name="mat" placeholder="Mat" required />
        <input name="beteende" placeholder="Beteenden" required />
        <button type="submit">Lägg till saker</button>
      </form>

      <ul>
        {logs.map((log) => (
          <li key={log.id}>
            {log.timestamp}: {log.mat} - {log.beteende}
          </li>
        ))}
      </ul>
    </div>
  );
};
