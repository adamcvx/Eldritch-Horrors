import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cloudEnabled } from '@/api/cloudSave';
import { exportPlayerSave } from '@/api/localBase44';

export default function SaveTransfer() {
  const [exportedText, setExportedText] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function transfer(operation) {
    setWorking(true);
    setMessage('');
    try {
      await operation();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setWorking(false);
    }
  }

  function download() {
    return transfer(async () => {
      const save = await exportPlayerSave();
      const url = URL.createObjectURL(new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'eldritch-horrors-save.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Save exported.');
    });
  }

  return <section className="mt-6 space-y-3 border-t pt-5">
    <h2 className="text-xl font-semibold">Game save</h2>
    <p className="text-sm text-muted-foreground">
      {cloudEnabled ? 'Progress saves to Turso. Sign in to access your progress on another device.' : 'Progress saves in this browser.'}
    </p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={download} disabled={working}>Export save</Button>
      <Button type="button" disabled={working} onClick={() => transfer(async () => {
        await navigator.clipboard.writeText(JSON.stringify(await exportPlayerSave()));
        setMessage('Save copied to clipboard.');
      })}>Copy save</Button>
    </div>
    <Button type="button" variant="outline" disabled={working} onClick={() => transfer(async () => {
      setExportedText(JSON.stringify(await exportPlayerSave()));
    })}>Show save JSON</Button>
    {exportedText && <label className="block">Exported save JSON
      <textarea className="block w-full border rounded bg-background" readOnly value={exportedText}
        onFocus={event => event.currentTarget.select()} rows={3} />
    </label>}
    <p role="status">{message}</p>
  </section>;
}
